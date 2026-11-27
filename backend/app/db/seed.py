from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import JobRole, Resume, ResumeSection, ResumeVersion, RoleSkill
from app.parsers.entities import extract_structured_resume_entities
from app.parsers.sectioner import SegmentedSection


_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _build_sample_metadata(sample_item: dict) -> tuple[dict[str, bool], dict[str, str | None], dict]:
    """Compute canonical skills, contact flags, and masked contact from sample data."""
    segmented = [
        SegmentedSection(
            section_type=sec["section_type"],
            raw_heading=sec["raw_heading"],
            content_text=sec["content_text"],
            confidence=1.0,
            order_index=idx,
        )
        for idx, sec in enumerate(sample_item["sections"])
    ]
    entities = extract_structured_resume_entities(
        raw_text=sample_item["raw_text"],
        sections=segmented,
        base_warnings=[],
        layout_penalty=0.0,
    )
    payload = {
        **entities.structured_payload,
        "candidate_label": sample_item["candidate_label"],
        "sections": sample_item["sections"],
    }
    return entities.contact_flags, entities.masked_contact, payload


def seed_core_data(session: Session) -> dict[str, int]:
    """
    Idempotently seed the 4 mandatory SkillOrbit job roles and synthetic demo
    sample resumes. Safe to call repeatedly across restarts and migrations.
    """
    roles_payload = json.loads((_DATA_DIR / "roles_seed.json").read_text(encoding="utf-8"))
    roles_created = 0
    skills_created = 0

    for role_item in roles_payload["roles"]:
        existing_role = session.scalar(select(JobRole).where(JobRole.slug == role_item["slug"]))
        if existing_role is None:
            existing_role = JobRole(
                slug=role_item["slug"],
                title=role_item["title"],
                category=role_item["category"],
                is_core_mandatory=role_item.get("is_core_mandatory", True),
                description=role_item["description"],
            )
            session.add(existing_role)
            session.flush()
            roles_created += 1

        existing_keys = {
            row.canonical_key
            for row in session.scalars(select(RoleSkill).where(RoleSkill.job_role_id == existing_role.id))
        }
        for skill_item in role_item["skills"]:
            if skill_item["canonical_key"] in existing_keys:
                continue
            session.add(
                RoleSkill(
                    job_role_id=existing_role.id,
                    skill_name=skill_item["skill_name"],
                    canonical_key=skill_item["canonical_key"],
                    category=skill_item["category"],
                    requirement_level=skill_item["requirement_level"],
                    weight=float(skill_item["weight"]),
                    learning_priority=int(skill_item["learning_priority"]),
                )
            )
            skills_created += 1

    samples_payload = json.loads((_DATA_DIR / "samples_seed.json").read_text(encoding="utf-8"))
    samples_created = 0

    for sample_item in samples_payload["samples"]:
        contact_flags, masked_contact, structured_payload = _build_sample_metadata(sample_item)
        existing_sample = session.scalar(
            select(Resume)
            .where(Resume.is_sample.is_(True), Resume.title == sample_item["title"])
            .options(selectinload(Resume.versions))
        )
        if existing_sample is not None:
            if existing_sample.versions:
                ver = next(
                    (v for v in existing_sample.versions if v.id == existing_sample.active_version_id),
                    existing_sample.versions[0],
                )
                ver.contact_flags_json = contact_flags
                ver.masked_contact_json = masked_contact
                ver.structured_payload_json = structured_payload
            continue

        resume = Resume(
            workspace_id=None,
            source_type="sample",
            is_sample=True,
            title=sample_item["title"],
        )
        session.add(resume)
        session.flush()

        raw_text = sample_item["raw_text"]
        version = ResumeVersion(
            resume_id=resume.id,
            version_number=1,
            file_name=None,
            file_size_bytes=None,
            template_slug=sample_item["template_slug"],
            candidate_label=sample_item["candidate_label"],
            contact_flags_json=contact_flags,
            masked_contact_json=masked_contact,
            structured_payload_json=structured_payload,
            raw_text=raw_text,
            word_count=len(raw_text.split()),
            extraction_confidence=1.0,
            parse_warnings_json=[],
        )
        session.add(version)
        session.flush()

        resume.active_version_id = version.id

        for idx, sec in enumerate(sample_item["sections"]):
            session.add(
                ResumeSection(
                    resume_version_id=version.id,
                    section_type=sec["section_type"],
                    raw_heading=sec["raw_heading"],
                    content_text=sec["content_text"],
                    confidence=1.0,
                    order_index=idx,
                )
            )

        samples_created += 1

    session.flush()
    return {
        "roles_created": roles_created,
        "skills_created": skills_created,
        "samples_created": samples_created,
    }
