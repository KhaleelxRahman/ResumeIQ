from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable

from uuid import UUID

from flask import g, request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Workspace


class ApiError(Exception):
    """Typed HTTP error rendered consistently into ErrorEnvelope JSON."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def hash_workspace_token(raw_token: str) -> str:
    """Compute SHA-256 hex digest so raw bearer tokens are never stored in DB."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def issue_workspace_session(session: Session, ttl_days: int) -> tuple[Workspace, str]:
    """Generate a CSPRNG workspace session token on the server and persist its hash."""
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    workspace = Workspace(
        token_hash=hash_workspace_token(raw_token),
        created_at=now,
        last_seen_at=now,
        expires_at=now + timedelta(days=ttl_days),
    )
    session.add(workspace)
    session.flush()
    return workspace, raw_token


def resolve_valid_workspace(session: Session, raw_token: str | None) -> Workspace:
    """
    Verify that X-Workspace-Token was issued by the server, exists in DB,
    and has not expired. Arbitrary client-supplied strings are always rejected.
    """
    if not raw_token or len(raw_token.strip()) < 32 or len(raw_token.strip()) > 128:
        raise ApiError(
            status_code=401,
            code="WORKSPACE_TOKEN_REQUIRED",
            message="A valid server-issued X-Workspace-Token header is required.",
        )

    token_hash = hash_workspace_token(raw_token.strip())
    workspace = session.scalar(select(Workspace).where(Workspace.token_hash == token_hash))
    if workspace is None:
        raise ApiError(
            status_code=401,
            code="WORKSPACE_TOKEN_INVALID",
            message="Workspace session token is invalid or has been deleted.",
        )

    now = datetime.now(timezone.utc)
    expires_at = workspace.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise ApiError(
            status_code=401,
            code="WORKSPACE_TOKEN_EXPIRED",
            message="Workspace session token has expired; request a new session.",
        )

    workspace.last_seen_at = now
    session.flush()
    return workspace


def purge_expired_workspaces(
    session: Session,
    now: datetime | None = None,
    limit: int | None = None,
) -> int:
    """
    Delete expired anonymous workspaces and cascade all child resumes, versions,
    sections, job descriptions, and analyses.
    """
    current_time = now or datetime.now(timezone.utc)
    stmt = select(Workspace).where(Workspace.expires_at <= current_time).order_by(Workspace.expires_at.asc())
    if limit is not None and limit > 0:
        stmt = stmt.limit(limit)

    expired_rows = session.scalars(stmt).all()
    for ws in expired_rows:
        session.delete(ws)
    if expired_rows:
        session.flush()
    return len(expired_rows)


def assert_workspace_ownership(
    resource_workspace_id: UUID | None,
    active_workspace: Workspace,
    resource_label: str = "Resource",
    *,
    allow_shared_sample: bool = False,
    is_sample: bool = False,
) -> None:
    """Enforce ownership isolation for private workspace resources."""
    if is_sample:
        if allow_shared_sample:
            return
        raise ApiError(
            status_code=403,
            code="SAMPLE_READ_ONLY",
            message=f"{resource_label} is a read-only synthetic sample and cannot be modified.",
        )

    if resource_workspace_id is None or resource_workspace_id != active_workspace.id:
        raise ApiError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message=f"{resource_label} was not found in the active workspace.",
        )


def require_workspace(fn: Callable[..., Any]) -> Callable[..., Any]:
    """Flask route decorator enforcing server-issued workspace token authentication."""

    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        session: Session = g.db_session
        raw_token = request.headers.get("X-Workspace-Token")
        g.workspace = resolve_valid_workspace(session, raw_token)
        return fn(*args, **kwargs)

    return wrapper
