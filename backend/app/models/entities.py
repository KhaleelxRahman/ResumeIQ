from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base


def utc_now() -> datetime:
    """Return timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class Workspace(Base):
    """Server-issued anonymous workspace session stored solely by SHA-256 token hash."""

    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    resumes: Mapped[list[Resume]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", passive_deletes=True
    )
    job_descriptions: Mapped[list[JobDescription]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", passive_deletes=True
    )
    analyses: Mapped[list[Analysis]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", passive_deletes=True
    )


class Resume(Base):
    """Top-level resume container owned by a workspace or flagged as a read-only synthetic sample."""

    __tablename__ = "resumes"
    __table_args__ = (
        Index("ix_resumes_workspace_created", "workspace_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source_type: Mapped[str] = mapped_column(
        Enum("upload_pdf", "upload_docx", "builder", "sample", name="resume_source_type", native_enum=False, create_constraint=True),
        nullable=False,
    )
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    active_version_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    workspace: Mapped[Workspace | None] = relationship(back_populates="resumes")
    versions: Mapped[list[ResumeVersion]] = relationship(
        back_populates="resume", cascade="all, delete-orphan", passive_deletes=True
    )


class ResumeVersion(Base):
    """Immutable or iterated version snapshot (v1, v2, ...) of a parsed or built resume."""

    __tablename__ = "resume_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    template_slug: Mapped[str] = mapped_column(String(64), default="swiss-technical", nullable=False)
    candidate_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contact_flags_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    masked_contact_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    structured_payload_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    extraction_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    parse_warnings_json: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    resume: Mapped[Resume] = relationship(back_populates="versions")
    sections: Mapped[list[ResumeSection]] = relationship(
        back_populates="resume_version", cascade="all, delete-orphan", passive_deletes=True
    )
    analyses: Mapped[list[Analysis]] = relationship(
        back_populates="resume_version", cascade="all, delete-orphan", passive_deletes=True
    )


class ResumeSection(Base):
    """Segmented section extracted from or authored inside a ResumeVersion."""

    __tablename__ = "resume_sections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_type: Mapped[str] = mapped_column(String(48), nullable=False)
    raw_heading: Mapped[str] = mapped_column(String(120), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    resume_version: Mapped[ResumeVersion] = relationship(back_populates="sections")


class JobRole(Base):
    """Curated target career role taxonomy."""

    __tablename__ = "job_roles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    is_core_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    skills: Mapped[list[RoleSkill]] = relationship(
        back_populates="job_role", cascade="all, delete-orphan", passive_deletes=True
    )


class RoleSkill(Base):
    """Mandatory or preferred skill requirement belonging to a JobRole."""

    __tablename__ = "role_skills"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    canonical_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    requirement_level: Mapped[str] = mapped_column(
        Enum("mandatory", "preferred", name="skill_requirement_level", native_enum=False, create_constraint=True),
        nullable=False,
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    learning_priority: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    job_role: Mapped[JobRole] = relationship(back_populates="skills")


class JobDescription(Base):
    """Workspace-scoped custom job description for keyword & requirement extraction."""

    __tablename__ = "job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_requirements_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    workspace: Mapped[Workspace] = relationship(back_populates="job_descriptions")


class Analysis(Base):
    """Immutable deterministic evaluation snapshot separating Quality, ATS Estimate, and Skill Match."""

    __tablename__ = "analyses"
    __table_args__ = (
        Index("ix_analyses_workspace_created", "workspace_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_role_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("job_roles.id", ondelete="SET NULL"), nullable=True
    )
    job_description_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True
    )
    experience_track: Mapped[str] = mapped_column(
        Enum("student_fresher", "junior", "mid", name="experience_track_enum", native_enum=False, create_constraint=True),
        nullable=False,
    )
    quality_score: Mapped[int] = mapped_column(Integer, nullable=False)
    ats_estimate: Mapped[int] = mapped_column(Integer, nullable=False)
    skill_match_pct: Mapped[float] = mapped_column(Float, nullable=False)
    quality_breakdown_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    ats_breakdown_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    engine_version: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    workspace: Mapped[Workspace] = relationship(back_populates="analyses")
    resume_version: Mapped[ResumeVersion] = relationship(back_populates="analyses")
    skill_matches: Mapped[list[AnalysisSkillMatch]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", passive_deletes=True
    )
    recommendations: Mapped[list[Recommendation]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", passive_deletes=True
    )


class AnalysisSkillMatch(Base):
    """Evidence-backed skill match state for a single requirement inside an Analysis."""

    __tablename__ = "analysis_skill_matches"
    __table_args__ = (
        Index("ix_skill_matches_analysis_status", "analysis_id", "match_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    requirement_level: Mapped[str] = mapped_column(
        Enum("mandatory", "preferred", name="match_requirement_level", native_enum=False, create_constraint=True),
        nullable=False,
    )
    match_status: Mapped[str] = mapped_column(
        Enum("matched", "synonym_matched", "uncertain", "missing", name="skill_match_status", native_enum=False, create_constraint=True),
        nullable=False,
    )
    evidence_section: Mapped[str | None] = mapped_column(String(48), nullable=True)
    evidence_snippet: Mapped[str | None] = mapped_column(String(320), nullable=True)
    learning_priority: Mapped[int | None] = mapped_column(Integer, nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="skill_matches")


class Recommendation(Base):
    """Prioritized deterministic improvement guidance tied to observed evidence."""

    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        Enum("high", "medium", "low", name="recommendation_priority", native_enum=False, create_constraint=True),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    issue: Mapped[str] = mapped_column(String(220), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_improvement: Mapped[str] = mapped_column(Text, nullable=False)
    example_rewrite: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="recommendations")
