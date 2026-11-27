from __future__ import annotations

from uuid import UUID

from flask import Blueprint, g, jsonify
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.auth_workspace import ApiError
from app.models.entities import Resume, ResumeVersion
from app.schemas.contracts import SampleResumeSummaryDTO

samples_bp = Blueprint("samples", __name__, url_prefix="/samples")


@samples_bp.get("")
def list_samples():
    """List pre-seeded read-only synthetic demo resumes."""
    resumes = g.db_session.scalars(
        select(Resume)
        .where(Resume.is_sample.is_(True))
        .options(selectinload(Resume.versions).selectinload(ResumeVersion.sections))
        .order_by(Resume.title.asc())
    ).all()

    items = []
    for resume in resumes:
        version = resume.versions[0] if resume.versions else None
        if version is None:
            continue
        dto = SampleResumeSummaryDTO(
            id=resume.id,
            title=resume.title,
            candidate_label=version.candidate_label,
            template_slug=version.template_slug,
            word_count=version.word_count,
            active_version_id=version.id,
            sections_count=len(version.sections),
        )
        items.append(dto.model_dump(mode="json"))

    return jsonify({"samples": items}), 200


@samples_bp.get("/<string:sample_id>")
def get_sample_detail(sample_id: str):
    """Return read-only extracted sections for a synthetic sample resume."""
    try:
        parsed_id = UUID(sample_id)
    except ValueError as exc:
        raise ApiError(400, "INVALID_UUID", "Sample identifier must be a valid UUID.") from exc

    resume = g.db_session.scalar(
        select(Resume)
        .where(Resume.id == parsed_id, Resume.is_sample.is_(True))
        .options(selectinload(Resume.versions).selectinload(ResumeVersion.sections))
    )
    if resume is None or not resume.versions:
        raise ApiError(404, "SAMPLE_NOT_FOUND", "Synthetic sample resume not found.")

    version = resume.versions[0]
    sections = [
        {
            "section_type": s.section_type,
            "raw_heading": s.raw_heading,
            "content_text": s.content_text,
            "order_index": s.order_index,
        }
        for s in sorted(version.sections, key=lambda sec: sec.order_index)
    ]

    return jsonify(
        {
            "id": str(resume.id),
            "title": resume.title,
            "is_sample": True,
            "candidate_label": version.candidate_label,
            "template_slug": version.template_slug,
            "word_count": version.word_count,
            "contact_flags": version.contact_flags_json,
            "sections": sections,
        }
    ), 200
