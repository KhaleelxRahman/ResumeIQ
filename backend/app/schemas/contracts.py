from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: str
    db: str
    nlp_ready: bool
    hf_mode: str
    version: str
    engine_version: str


class WorkspaceSessionCreateResponse(BaseModel):
    workspace_id: UUID
    token: str
    expires_at: datetime


class WorkspaceSessionStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    workspace_id: UUID
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime


class RoleSkillDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_name: str
    canonical_key: str
    category: str
    requirement_level: str
    weight: float
    learning_priority: int


class JobRoleSummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    category: str
    is_core_mandatory: bool
    description: str
    mandatory_count: int
    preferred_count: int


class JobRoleDetailDTO(JobRoleSummaryDTO):
    skills: list[RoleSkillDTO]


class SampleResumeSummaryDTO(BaseModel):
    id: UUID
    title: str
    candidate_label: str | None
    template_slug: str
    word_count: int
    active_version_id: UUID
    sections_count: int


class ParseWarningDTO(BaseModel):
    code: str
    severity: str
    message: str


class ResumeSectionDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    section_type: str
    raw_heading: str
    content_text: str
    confidence: float
    order_index: int


class ResumeVersionDetailDTO(BaseModel):
    version_id: UUID
    version_number: int
    file_name: str | None
    file_size_bytes: int | None
    template_slug: str
    candidate_label: str | None
    contact_flags: dict[str, bool]
    masked_contact: dict[str, str | None]
    structured_payload: dict[str, Any]
    raw_text: str
    word_count: int
    extraction_confidence: float
    parse_warnings: list[ParseWarningDTO]
    sections: list[ResumeSectionDTO]
    created_at: datetime


class ResumeDetailDTO(BaseModel):
    id: UUID
    title: str
    source_type: str
    is_sample: bool
    active_version_id: UUID | None
    created_at: datetime
    updated_at: datetime
    version: ResumeVersionDetailDTO


class ResumeListItemDTO(BaseModel):
    id: UUID
    title: str
    source_type: str
    is_sample: bool
    active_version_id: UUID | None
    candidate_label: str | None
    word_count: int
    extraction_confidence: float
    warnings_count: int
    created_at: datetime


class EditableSectionInputDTO(BaseModel):
    section_type: str = Field(min_length=1, max_length=48)
    raw_heading: str = Field(min_length=1, max_length=120)
    content_text: str = Field(max_length=40000)


class UpdateParsedVersionRequestDTO(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    candidate_label: str | None = Field(default=None, max_length=120)
    sections: list[EditableSectionInputDTO] | None = Field(default=None, min_length=1, max_length=25)
    structured_payload: dict[str, Any] | None = None
