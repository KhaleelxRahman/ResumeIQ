from __future__ import annotations

import os
from dataclasses import dataclass, field


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_origins(raw: str | None) -> list[str]:
    if not raw:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
DEFAULT_MULTIPART_OVERHEAD_BYTES = 256 * 1024


@dataclass(slots=True)
class AppConfig:
    """Environment-driven application configuration for ResumeIQ Flask service."""

    APP_ENV: str = field(default_factory=lambda: os.getenv("FLASK_ENV", "development"))
    TESTING: bool = field(default_factory=lambda: _parse_bool(os.getenv("TESTING"), False))
    DATABASE_URL: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./resumeiq_dev.db")
    )
    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: _parse_origins(os.getenv("CORS_ORIGINS"))
    )
    MAX_UPLOAD_BYTES: int = field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)))
    )
    MULTIPART_OVERHEAD_BYTES: int = field(
        default_factory=lambda: int(
            os.getenv("MULTIPART_OVERHEAD_BYTES", str(DEFAULT_MULTIPART_OVERHEAD_BYTES))
        )
    )
    MAX_CONTENT_LENGTH: int = field(init=False)
    WORKSPACE_TTL_DAYS: int = field(
        default_factory=lambda: int(os.getenv("WORKSPACE_TTL_DAYS", "30"))
    )
    MAX_RESUMES_PER_WORKSPACE: int = field(
        default_factory=lambda: int(os.getenv("MAX_RESUMES_PER_WORKSPACE", "25"))
    )
    RATE_LIMIT_ENABLED: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("RATE_LIMIT_ENABLED"), True)
    )
    RATE_LIMIT_SESSION_PER_MIN: int = field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_SESSION_PER_MIN", "20"))
    )
    RATE_LIMIT_UPLOAD_PER_MIN: int = field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_UPLOAD_PER_MIN", "15"))
    )
    RATE_LIMIT_DELETE_PER_MIN: int = field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_DELETE_PER_MIN", "20"))
    )
    ENABLE_HF_EMBEDDINGS: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("ENABLE_HF_EMBEDDINGS"), False)
    )
    ENABLE_DOCX_BUILDER_EXPORT: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("ENABLE_DOCX_BUILDER_EXPORT"), False)
    )
    APP_VERSION: str = "0.6.0-phase6"
    ENGINE_VERSION: str = "1.0.0-deterministic"
    AUTO_SEED_CORE: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("AUTO_SEED_CORE"), True)
    )

    def __post_init__(self) -> None:
        # Leave explicit multipart header headroom so exact 5 MB resume files are accepted cleanly.
        self.MAX_CONTENT_LENGTH = self.MAX_UPLOAD_BYTES + self.MULTIPART_OVERHEAD_BYTES
