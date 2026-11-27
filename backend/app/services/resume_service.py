from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from werkzeug.datastructures import FileStorage

from app.api.auth_workspace import ApiError, assert_workspace_ownership
from app.models.entities import Resume, ResumeSection, ResumeVersion, Workspace
from app.parsers.detector import (
    DEFAULT_MAX_UPLOAD_BYTES,
    validate_file_signature,
    validate_upload_metadata,
)
from app.parsers.docx_parser import parse_docx_document
from app.parsers.entities import extract_structured_resume_entities
from app.parsers.pdf_parser import parse_pdf_document
from app.parsers.sectioner import segment_resume_sections
from app.parsers.storage import ephemeral_upload_path
from app.schemas.contracts import (
    ParseWarningDTO,
    ResumeDetailDTO,
    ResumeListItemDTO,
    ResumeSectionDTO,
    ResumeVersionDetailDTO,
    UpdateParsedVersionRequestDTO,
)


def _read_bounded_upload_bytes(file_storage: FileStorage, max_bytes: int) -> bytes:
    """Read uploaded stream with a hard max_bytes + 1 ceiling to reject huge streams early."""
    stream = file_storage.stream
    stream.seek(0)
    chunk = stream.read(max_bytes + 1)
    return chunk


def _version_to_dto(version: ResumeVersion) -> ResumeVersionDetailDTO:
    sorted_sections = sorted(version.sections, key=lambda s: s.order_index)
    warnings = [
        ParseWarningDTO(
            code=str(w.get("code", "PARSE_WARNING")),
            severity=str(w.get("severity", "info")),
            message=str(w.get("message", "")),
        )
        for w in (version.parse_warnings_json or [])
    ]
    return ResumeVersionDetailDTO(
        version_id=version.id,
        version_number=version.version_number,
        file_name=version.file_name,
        file_size_bytes=version.file_size_bytes,
        template_slug=version.template_slug,
        candidate_label=version.candidate_label,
        contact_flags={k: bool(v) for k, v in (version.contact_flags_json or {}).items()},
        masked_contact=dict(version.masked_contact_json or {}),
        structured_payload=dict(version.structured_payload_json or {}),
        raw_text=version.raw_text,
        word_count=version.word_count,
        extraction_confidence=float(version.extraction_confidence),
        parse_warnings=warnings,
        sections=[ResumeSectionDTO.model_validate(sec) for sec in sorted_sections],
        created_at=version.created_at,
    )


def _resume_to_detail_dto(resume: Resume, version: ResumeVersion) -> ResumeDetailDTO:
    return ResumeDetailDTO(
        id=resume.id,
        title=resume.title,
        source_type=resume.source_type,
        is_sample=resume.is_sample,
        active_version_id=resume.active_version_id,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
        version=_version_to_dto(version),
    )


def parse_and_persist_upload(
    session: Session,
    workspace: Workspace,
    file_storage: FileStorage,
    title_override: str | None = None,
    max_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
) -> ResumeDetailDTO:
    """
    Validate, parse via ephemeral temporary storage (deleted unconditionally in
    finally:), and persist extracted text & structured resume sections.
    """
    raw_bytes = _read_bounded_upload_bytes(file_storage, max_bytes=max_bytes)
    meta = validate_upload_metadata(
        filename=file_storage.filename,
        content_type=file_storage.mimetype,
        size_bytes=len(raw_bytes),
        max_bytes=max_bytes,
    )

    def _write_temp(path: Path) -> None:
        path.write_bytes(raw_bytes)

    with ephemeral_upload_path(meta.extension, writer=_write_temp) as temp_path:
        validate_file_signature(temp_path, meta.extension)
        parsed = (
            parse_pdf_document(temp_path)
            if meta.extension == "pdf"
            else parse_docx_document(temp_path)
        )

    sections = segment_resume_sections(parsed.raw_text)
    entities = extract_structured_resume_entities(
        raw_text=parsed.raw_text,
        sections=sections,
        base_warnings=parsed.warnings,
        layout_penalty=parsed.layout_penalty,
    )

    clean_title = (title_override or "").strip() or meta.safe_display_name.rsplit(".", 1)[0]
    clean_title = clean_title[:160] or "Uploaded Resume"

    resume = Resume(
        workspace_id=workspace.id,
        source_type=f"upload_{meta.extension}",
        is_sample=False,
        title=clean_title,
    )
    session.add(resume)
    session.flush()

    warnings_json = [
        {"code": w.code, "severity": w.severity, "message": w.message}
        for w in entities.warnings
    ]
    payload_json = {
        **entities.structured_payload,
        "page_count": parsed.page_count,
        "user_edited": False,
    }

    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        file_name=meta.safe_display_name,
        file_size_bytes=meta.size_bytes,
        template_slug="swiss-technical",
        candidate_label=entities.candidate_label,
        contact_flags_json=entities.contact_flags,
        masked_contact_json=entities.masked_contact,
        structured_payload_json=payload_json,
        raw_text=parsed.raw_text,
        word_count=len(parsed.raw_text.split()),
        extraction_confidence=entities.extraction_confidence,
        parse_warnings_json=warnings_json,
    )
    session.add(version)
    session.flush()

    resume.active_version_id = version.id

    section_rows: list[ResumeSection] = []
    for sec in sections:
        row = ResumeSection(
            resume_version_id=version.id,
            section_type=sec.section_type,
            raw_heading=sec.raw_heading,
            content_text=sec.content_text,
            confidence=sec.confidence,
            order_index=sec.order_index,
        )
        session.add(row)
        section_rows.append(row)

    session.commit()
    # Reload with sections eagerly for deterministic DTO output
    reloaded = session.scalar(
        select(ResumeVersion)
        .where(ResumeVersion.id == version.id)
        .options(selectinload(ResumeVersion.sections))
    )
    assert reloaded is not None
    return _resume_to_detail_dto(resume, reloaded)


def list_workspace_resumes(
    session: Session,
    workspace: Workspace,
    include_samples: bool = True,
) -> list[ResumeListItemDTO]:
    """List resumes owned by active workspace (plus optional read-only samples)."""
    stmt = (
        select(Resume)
        .options(selectinload(Resume.versions))
        .order_by(Resume.created_at.desc())
    )
    if include_samples:
        stmt = stmt.where((Resume.workspace_id == workspace.id) | (Resume.is_sample.is_(True)))
    else:
        stmt = stmt.where(Resume.workspace_id == workspace.id)

    resumes = session.scalars(stmt).all()
    items: list[ResumeListItemDTO] = []
    for res in resumes:
        active_ver = next(
            (v for v in res.versions if v.id == res.active_version_id),
            res.versions[0] if res.versions else None,
        )
        if active_ver is None:
            continue
        items.append(
            ResumeListItemDTO(
                id=res.id,
                title=res.title,
                source_type=res.source_type,
                is_sample=res.is_sample,
                active_version_id=res.active_version_id,
                candidate_label=active_ver.candidate_label,
                word_count=active_ver.word_count,
                extraction_confidence=float(active_ver.extraction_confidence),
                warnings_count=len(active_ver.parse_warnings_json or []),
                created_at=res.created_at,
            )
        )
    return items


def _load_resume_with_versions(session: Session, resume_id: UUID) -> Resume:
    resume = session.scalar(
        select(Resume)
        .where(Resume.id == resume_id)
        .options(selectinload(Resume.versions).selectinload(ResumeVersion.sections))
    )
    if resume is None:
        raise ApiError(404, "RESOURCE_NOT_FOUND", "Resume was not found in the active workspace.")
    return resume


def get_resume_detail(
    session: Session,
    workspace: Workspace,
    resume_id: UUID,
) -> ResumeDetailDTO:
    """Return resume & active version details if owned by workspace or public synthetic sample."""
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=True,
        is_sample=resume.is_sample,
    )
    active_ver = next(
        (v for v in resume.versions if v.id == resume.active_version_id),
        resume.versions[0] if resume.versions else None,
    )
    if active_ver is None:
        raise ApiError(404, "RESUME_VERSION_NOT_FOUND", "Active resume version not found.")
    return _resume_to_detail_dto(resume, active_ver)


def update_parsed_version(
    session: Session,
    workspace: Workspace,
    resume_id: UUID,
    version_id: UUID,
    dto: UpdateParsedVersionRequestDTO,
) -> ResumeDetailDTO:
    """
    Allow users to review and correct parsed section headers/content before
    analysis while preserving original extracted raw_text evidence intact.
    """
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=False,
        is_sample=resume.is_sample,
    )

    version = next((v for v in resume.versions if v.id == version_id), None)
    if version is None:
        raise ApiError(404, "RESUME_VERSION_NOT_FOUND", "Resume version was not found.")

    if dto.title is not None:
        resume.title = dto.title.strip()
    if dto.candidate_label is not None:
        version.candidate_label = dto.candidate_label.strip() or None

    if dto.sections is not None:
        version.sections.clear()
        session.flush()

        for idx, sec_in in enumerate(dto.sections):
            version.sections.append(
                ResumeSection(
                    resume_version_id=version.id,
                    section_type=sec_in.section_type.strip(),
                    raw_heading=sec_in.raw_heading.strip(),
                    content_text=sec_in.content_text.strip(),
                    confidence=1.0,
                    order_index=idx,
                )
            )

    current_payload = dict(version.structured_payload_json or {})
    if dto.structured_payload is not None:
        current_payload.update(dto.structured_payload)
    if dto.candidate_label is not None:
        current_payload["candidate_label"] = version.candidate_label
    current_payload["user_edited"] = True
    current_payload["edited_at"] = datetime.now(timezone.utc).isoformat()
    version.structured_payload_json = current_payload
    resume.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.expire_all()
    reloaded = _load_resume_with_versions(session, resume_id)
    refreshed_version = next(v for v in reloaded.versions if v.id == version_id)
    return _resume_to_detail_dto(reloaded, refreshed_version)


def delete_workspace_resume(
    session: Session,
    workspace: Workspace,
    resume_id: UUID,
) -> None:
    """Permanently delete a workspace-owned resume and cascade all versions/sections/analyses."""
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=False,
        is_sample=resume.is_sample,
    )
    session.delete(resume)
    session.commit()
