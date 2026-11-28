from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from werkzeug.datastructures import FileStorage

from app.api.auth_workspace import ApiError, assert_workspace_ownership
from app.models.entities import Resume, ResumeSection, ResumeVersion, Workspace
from app.parsers.detector import (
    DEFAULT_MAX_UPLOAD_BYTES,
    sanitize_display_filename,
    validate_file_signature,
    validate_upload_metadata,
)
from app.parsers.docx_parser import parse_docx_document
from app.parsers.entities import compose_sections_text, extract_structured_resume_entities
from app.parsers.pdf_parser import parse_pdf_document
from app.parsers.sectioner import SegmentedSection, segment_resume_sections
from app.parsers.storage import ephemeral_upload_path
from app.reports.resume_pdf_exporter import BuilderPdfInput, PdfSectionInput, render_resume_pdf
from app.schemas.contracts import (
    BuilderContactDTO,
    BuilderDocumentPayloadDTO,
    CreateBuilderResumeRequestDTO,
    ParseWarningDTO,
    ResumeDetailDTO,
    ResumeListItemDTO,
    ResumeSectionDTO,
    ResumeVersionDetailDTO,
    ResumeVersionSummaryDTO,
    SaveBuilderVersionRequestDTO,
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
    version_summaries = [
        ResumeVersionSummaryDTO(
            version_id=v.id,
            version_number=v.version_number,
            template_slug=v.template_slug,
            word_count=v.word_count,
            created_at=v.created_at,
        )
        for v in sorted(resume.versions, key=lambda item: item.version_number)
    ]
    return ResumeDetailDTO(
        id=resume.id,
        title=resume.title,
        source_type=resume.source_type,
        is_sample=resume.is_sample,
        active_version_id=resume.active_version_id,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
        version=_version_to_dto(version),
        versions=version_summaries,
    )


def _enforce_workspace_resume_quota(
    session: Session,
    workspace: Workspace,
    max_workspace_resumes: int | None,
) -> None:
    if max_workspace_resumes is None or max_workspace_resumes <= 0:
        return
    existing_count = session.scalar(
        select(func.count(Resume.id)).where(Resume.workspace_id == workspace.id)
    )
    if (existing_count or 0) >= max_workspace_resumes:
        raise ApiError(
            status_code=429,
            code="WORKSPACE_QUOTA_EXCEEDED",
            message=f"Workspace resume limit ({max_workspace_resumes}) reached. Delete unused resumes before creating or uploading more.",
            details={"max_resumes": max_workspace_resumes},
        )


def _build_builder_header_section(contact: BuilderContactDTO) -> SegmentedSection:
    parts = [
        item
        for item in (
            contact.email,
            contact.phone,
            contact.location,
            contact.github,
            contact.linkedin,
            contact.portfolio,
        )
        if item
    ]
    lines = [contact.full_name]
    if parts:
        lines.append(" | ".join(parts))
    return SegmentedSection(
        section_type="header_contact",
        raw_heading="HEADER",
        content_text="\n".join(lines),
        confidence=1.0,
        order_index=0,
    )


def _build_builder_sections(dto: BuilderDocumentPayloadDTO) -> list[SegmentedSection]:
    header = _build_builder_header_section(dto.contact)
    body = [
        SegmentedSection(
            section_type=sec.section_type,
            raw_heading=sec.raw_heading.strip(),
            content_text=sec.content_text.strip(),
            confidence=1.0,
            order_index=idx + 1,
        )
        for idx, sec in enumerate(dto.sections)
        if sec.raw_heading.strip() and sec.content_text.strip()
    ]
    if not body:
        raise ApiError(
            status_code=400,
            code="EMPTY_BUILDER_SECTIONS",
            message="Provide at least one non-empty resume section alongside contact details.",
        )
    return [header, *body]


def _persist_new_version(
    session: Session,
    *,
    resume: Resume,
    version_number: int,
    template_slug: str,
    raw_text: str,
    sections: list[SegmentedSection],
    file_name: str | None = None,
    file_size_bytes: int | None = None,
    base_warnings: list | None = None,
    layout_penalty: float = 0.0,
    candidate_label_override: str | None = None,
    extra_payload: dict | None = None,
) -> ResumeVersion:
    entities = extract_structured_resume_entities(
        raw_text=raw_text,
        sections=sections,
        base_warnings=list(base_warnings or []),
        layout_penalty=layout_penalty,
    )
    warnings_json = [
        {"code": w.code, "severity": w.severity, "message": w.message}
        for w in entities.warnings
    ]
    payload_json = {
        **entities.structured_payload,
        **(extra_payload or {}),
        "user_edited": False,
    }
    candidate_label = candidate_label_override or entities.candidate_label
    if candidate_label:
        payload_json["candidate_label"] = candidate_label

    version = ResumeVersion(
        resume_id=resume.id,
        version_number=version_number,
        file_name=file_name,
        file_size_bytes=file_size_bytes,
        template_slug=template_slug,
        candidate_label=candidate_label,
        contact_flags_json=entities.contact_flags,
        masked_contact_json=entities.masked_contact,
        structured_payload_json=payload_json,
        raw_text=raw_text,
        word_count=len(raw_text.split()),
        extraction_confidence=entities.extraction_confidence,
        parse_warnings_json=warnings_json,
    )
    session.add(version)
    session.flush()

    for sec in sections:
        session.add(
            ResumeSection(
                resume_version_id=version.id,
                section_type=sec.section_type,
                raw_heading=sec.raw_heading,
                content_text=sec.content_text,
                confidence=sec.confidence,
                order_index=sec.order_index,
            )
        )

    resume.active_version_id = version.id
    resume.updated_at = datetime.now(timezone.utc)
    return version


def parse_and_persist_upload(
    session: Session,
    workspace: Workspace,
    file_storage: FileStorage,
    title_override: str | None = None,
    max_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
    max_workspace_resumes: int | None = 25,
) -> ResumeDetailDTO:
    """
    Validate, parse via ephemeral temporary storage (deleted unconditionally in
    finally:), and persist extracted text & structured resume sections.
    """
    _enforce_workspace_resume_quota(session, workspace, max_workspace_resumes)

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

    version = _persist_new_version(
        session,
        resume=resume,
        version_number=1,
        template_slug="swiss-technical",
        raw_text=parsed.raw_text,
        sections=sections,
        file_name=meta.safe_display_name,
        file_size_bytes=meta.size_bytes,
        base_warnings=parsed.warnings,
        layout_penalty=parsed.layout_penalty,
        extra_payload={"page_count": parsed.page_count},
    )

    session.commit()
    reloaded = _load_resume_with_versions(session, resume.id)
    reloaded_version = next(v for v in reloaded.versions if v.id == version.id)
    return _resume_to_detail_dto(reloaded, reloaded_version)


def create_builder_resume(
    session: Session,
    workspace: Workspace,
    dto: CreateBuilderResumeRequestDTO,
    max_workspace_resumes: int | None = 25,
) -> ResumeDetailDTO:
    """Persist a guided Student Resume Builder document (v1) inside the active workspace."""
    _enforce_workspace_resume_quota(session, workspace, max_workspace_resumes)
    sections = _build_builder_sections(dto)
    raw_text = compose_sections_text(sections)

    resume = Resume(
        workspace_id=workspace.id,
        source_type="builder",
        is_sample=False,
        title=dto.title[:160] or "Student Resume Draft",
    )
    session.add(resume)
    session.flush()

    version = _persist_new_version(
        session,
        resume=resume,
        version_number=1,
        template_slug=dto.template_slug,
        raw_text=raw_text,
        sections=sections,
        candidate_label_override=dto.contact.full_name,
        extra_payload={"builder_contact": dto.contact.model_dump(mode="json")},
    )
    session.commit()
    reloaded = _load_resume_with_versions(session, resume.id)
    reloaded_version = next(v for v in reloaded.versions if v.id == version.id)
    return _resume_to_detail_dto(reloaded, reloaded_version)


def create_builder_version(
    session: Session,
    workspace: Workspace,
    resume_id: UUID,
    dto: SaveBuilderVersionRequestDTO,
    max_versions_per_resume: int = 50,
) -> ResumeDetailDTO:
    """Save an immutable numbered snapshot (v2, v3, ...) of a workspace resume from Builder."""
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=False,
        is_sample=resume.is_sample,
    )
    if len(resume.versions) >= max_versions_per_resume:
        raise ApiError(
            status_code=429,
            code="VERSION_QUOTA_EXCEEDED",
            message=f"Maximum saved snapshots ({max_versions_per_resume}) reached for this resume.",
        )

    sections = _build_builder_sections(dto)
    raw_text = compose_sections_text(sections)
    if dto.title is not None:
        resume.title = dto.title[:160]

    next_number = max((v.version_number for v in resume.versions), default=0) + 1
    version = _persist_new_version(
        session,
        resume=resume,
        version_number=next_number,
        template_slug=dto.template_slug,
        raw_text=raw_text,
        sections=sections,
        candidate_label_override=dto.contact.full_name,
        extra_payload={"builder_contact": dto.contact.model_dump(mode="json")},
    )
    session.commit()
    session.expire_all()
    reloaded = _load_resume_with_versions(session, resume.id)
    reloaded_version = next(v for v in reloaded.versions if v.id == version.id)
    return _resume_to_detail_dto(reloaded, reloaded_version)


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
    version_id: UUID | None = None,
) -> ResumeDetailDTO:
    """Return resume & selected (or active) version details if owned by workspace or sample."""
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=True,
        is_sample=resume.is_sample,
    )
    if version_id is not None:
        selected_ver = next((v for v in resume.versions if v.id == version_id), None)
        if selected_ver is None:
            raise ApiError(404, "RESUME_VERSION_NOT_FOUND", "Requested resume version was not found.")
        return _resume_to_detail_dto(resume, selected_ver)

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

    if dto.template_slug is not None:
        version.template_slug = dto.template_slug

    explicit_candidate_label = "candidate_label" in dto.model_fields_set
    if dto.contact is not None:
        version.candidate_label = dto.contact.full_name
    elif explicit_candidate_label:
        version.candidate_label = dto.candidate_label.strip() or None if dto.candidate_label is not None else None

    if dto.sections is not None or dto.contact is not None:
        existing_sorted = sorted(version.sections, key=lambda s: s.order_index)
        raw_sections_input = (
            [
                (sec.section_type.strip(), sec.raw_heading.strip(), sec.content_text.strip())
                for sec in dto.sections
                if sec.raw_heading.strip() and sec.content_text.strip()
            ]
            if dto.sections is not None
            else [
                (sec.section_type, sec.raw_heading, sec.content_text)
                for sec in existing_sorted
                if sec.section_type != "header_contact"
            ]
        )
        if dto.contact is not None:
            header_sec = _build_builder_header_section(dto.contact)
            non_header = [item for item in raw_sections_input if item[0] != "header_contact"]
            combined_tuples = [(header_sec.section_type, header_sec.raw_heading, header_sec.content_text), *non_header]
        else:
            combined_tuples = raw_sections_input

        version.sections.clear()
        session.flush()

        for idx, (sec_type, heading, content) in enumerate(combined_tuples):
            version.sections.append(
                ResumeSection(
                    resume_version_id=version.id,
                    section_type=sec_type,
                    raw_heading=heading,
                    content_text=content,
                    confidence=1.0,
                    order_index=idx,
                )
            )
        session.flush()

        segmented = [
            SegmentedSection(
                section_type=sec.section_type,
                raw_heading=sec.raw_heading,
                content_text=sec.content_text,
                confidence=float(sec.confidence),
                order_index=sec.order_index,
            )
            for sec in sorted(version.sections, key=lambda s: s.order_index)
        ]
        edited_text = compose_sections_text(segmented)
        derived = extract_structured_resume_entities(
            raw_text=edited_text,
            sections=segmented,
            base_warnings=[],
            layout_penalty=0.0,
        )

        if dto.contact is None and not explicit_candidate_label and derived.candidate_label is not None:
            version.candidate_label = derived.candidate_label

        prev_payload = dict(version.structured_payload_json or {})
        preserved_page_count = prev_payload.get("page_count")
        preserved_contact = (
            dto.contact.model_dump(mode="json")
            if dto.contact is not None
            else prev_payload.get("builder_contact")
        )
        current_payload = {
            **derived.structured_payload,
            **({"page_count": preserved_page_count} if preserved_page_count is not None else {}),
            **({"builder_contact": preserved_contact} if preserved_contact is not None else {}),
        }
        version.word_count = len(edited_text.split())
        version.contact_flags_json = derived.contact_flags
        version.masked_contact_json = derived.masked_contact
    else:
        current_payload = dict(version.structured_payload_json or {})

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


def export_resume_version_pdf(
    session: Session,
    workspace: Workspace,
    resume_id: UUID,
    version_id: UUID,
) -> tuple[bytes, str]:
    """Render an ATS-safe single-column PDF export for a saved resume version."""
    resume = _load_resume_with_versions(session, resume_id)
    assert_workspace_ownership(
        resume.workspace_id,
        workspace,
        "Resume",
        allow_shared_sample=True,
        is_sample=resume.is_sample,
    )
    version = next((v for v in resume.versions if v.id == version_id), None)
    if version is None:
        raise ApiError(404, "RESUME_VERSION_NOT_FOUND", "Resume version was not found.")

    sorted_sections = sorted(version.sections, key=lambda s: s.order_index)
    builder_contact = (version.structured_payload_json or {}).get("builder_contact")

    candidate_label = version.candidate_label
    contact_lines: list[str] = []
    if isinstance(builder_contact, dict):
        full_name = str(builder_contact.get("full_name") or "").strip()
        if full_name:
            candidate_label = full_name
        items = [
            str(builder_contact.get(k) or "").strip()
            for k in ("email", "phone", "location", "github", "linkedin", "portfolio")
            if str(builder_contact.get(k) or "").strip()
        ]
        if items:
            contact_lines.append(" | ".join(items))
    else:
        header_sec = next((s for s in sorted_sections if s.section_type == "header_contact"), None)
        if header_sec is not None:
            raw_lines = [ln.strip() for ln in header_sec.content_text.splitlines() if ln.strip()]
            if raw_lines:
                if not candidate_label:
                    candidate_label = raw_lines[0]
                    contact_lines.extend(raw_lines[1:])
                elif raw_lines[0].lower() == candidate_label.lower():
                    contact_lines.extend(raw_lines[1:])
                else:
                    contact_lines.extend(raw_lines)

    template_slug = (
        version.template_slug
        if version.template_slug in {"swiss-technical", "academic-editorial"}
        else "swiss-technical"
    )
    pdf_input = BuilderPdfInput(
        title=resume.title,
        candidate_label=candidate_label,
        template_slug=template_slug,  # type: ignore[arg-type]
        contact_lines=tuple(contact_lines),
        sections=tuple(
            PdfSectionInput(
                section_type=s.section_type,
                raw_heading=s.raw_heading,
                content_text=s.content_text,
            )
            for s in sorted_sections
            if s.section_type != "header_contact"
        ),
    )
    pdf_bytes = render_resume_pdf(pdf_input)
    safe_stem = sanitize_display_filename(resume.title).rsplit(".", 1)[0].strip("._") or "resume"
    return pdf_bytes, f"{safe_stem}_v{version.version_number}.pdf"


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
