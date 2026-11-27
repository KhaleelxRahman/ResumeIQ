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
    MAX_CONTENT_LENGTH: int = field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    )
    WORKSPACE_TTL_DAYS: int = field(
        default_factory=lambda: int(os.getenv("WORKSPACE_TTL_DAYS", "30"))
    )
    ENABLE_HF_EMBEDDINGS: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("ENABLE_HF_EMBEDDINGS"), False)
    )
    ENABLE_DOCX_BUILDER_EXPORT: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("ENABLE_DOCX_BUILDER_EXPORT"), False)
    )
    APP_VERSION: str = "0.2.0-phase4"
    ENGINE_VERSION: str = "1.0.0-deterministic"
    AUTO_SEED_CORE: bool = field(
        default_factory=lambda: _parse_bool(os.getenv("AUTO_SEED_CORE"), True)
    )
