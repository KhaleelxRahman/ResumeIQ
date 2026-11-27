from __future__ import annotations

from flask import Blueprint, g, jsonify
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.auth_workspace import ApiError
from app.models.entities import JobRole
from app.schemas.contracts import JobRoleDetailDTO, JobRoleSummaryDTO, RoleSkillDTO

roles_bp = Blueprint("roles", __name__, url_prefix="/job-roles")


@roles_bp.get("")
def list_job_roles():
    """Return seeded SkillOrbit target roles with mandatory/preferred skill counts."""
    roles = g.db_session.scalars(
        select(JobRole).options(selectinload(JobRole.skills)).order_by(JobRole.title.asc())
    ).all()

    items = []
    for role in roles:
        mandatory_count = sum(1 for s in role.skills if s.requirement_level == "mandatory")
        preferred_count = sum(1 for s in role.skills if s.requirement_level == "preferred")
        dto = JobRoleSummaryDTO(
            id=role.id,
            slug=role.slug,
            title=role.title,
            category=role.category,
            is_core_mandatory=role.is_core_mandatory,
            description=role.description,
            mandatory_count=mandatory_count,
            preferred_count=preferred_count,
        )
        items.append(dto.model_dump(mode="json"))

    return jsonify({"roles": items}), 200


@roles_bp.get("/<string:slug>")
def get_job_role_detail(slug: str):
    """Return complete mandatory and preferred skill taxonomy for a target job role."""
    role = g.db_session.scalar(
        select(JobRole).where(JobRole.slug == slug).options(selectinload(JobRole.skills))
    )
    if role is None:
        raise ApiError(404, "JOB_ROLE_NOT_FOUND", f"Target job role '{slug}' was not found.")

    mandatory_count = sum(1 for s in role.skills if s.requirement_level == "mandatory")
    preferred_count = sum(1 for s in role.skills if s.requirement_level == "preferred")
    sorted_skills = sorted(
        role.skills,
        key=lambda s: (0 if s.requirement_level == "mandatory" else 1, s.learning_priority, s.skill_name),
    )

    dto = JobRoleDetailDTO(
        id=role.id,
        slug=role.slug,
        title=role.title,
        category=role.category,
        is_core_mandatory=role.is_core_mandatory,
        description=role.description,
        mandatory_count=mandatory_count,
        preferred_count=preferred_count,
        skills=[RoleSkillDTO.model_validate(s) for s in sorted_skills],
    )
    return jsonify(dto.model_dump(mode="json")), 200
