from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify

from app.api.auth_workspace import (
    issue_workspace_session,
    purge_expired_workspaces,
    require_workspace,
)
from app.api.rate_limit import enforce_rate_limit
from app.models.entities import Workspace
from app.schemas.contracts import (
    WorkspaceSessionCreateResponse,
    WorkspaceSessionStatusResponse,
)

workspaces_bp = Blueprint("workspaces", __name__, url_prefix="/workspaces")


@workspaces_bp.post("/session")
def create_workspace_session():
    """Issue a fresh server-generated cryptographic workspace session token."""
    cfg = current_app.config["APP_CONFIG"]
    enforce_rate_limit("workspace_session_create", cfg.RATE_LIMIT_SESSION_PER_MIN, window_seconds=60)
    purge_expired_workspaces(g.db_session, limit=25)
    workspace, raw_token = issue_workspace_session(g.db_session, ttl_days=cfg.WORKSPACE_TTL_DAYS)
    g.db_session.commit()
    payload = WorkspaceSessionCreateResponse(
        workspace_id=workspace.id,
        token=raw_token,
        expires_at=workspace.expires_at,
    )
    return jsonify(payload.model_dump(mode="json")), 201


@workspaces_bp.get("/current")
@require_workspace
def get_current_workspace():
    """Validate and inspect metadata for the authenticated workspace session."""
    ws: Workspace = g.workspace
    payload = WorkspaceSessionStatusResponse(
        workspace_id=ws.id,
        created_at=ws.created_at,
        last_seen_at=ws.last_seen_at,
        expires_at=ws.expires_at,
    )
    return jsonify(payload.model_dump(mode="json")), 200


@workspaces_bp.delete("/current")
@require_workspace
def delete_current_workspace():
    """Permanently purge the active workspace and cascade-delete all owned data."""
    cfg = current_app.config["APP_CONFIG"]
    enforce_rate_limit("workspace_delete", cfg.RATE_LIMIT_DELETE_PER_MIN, window_seconds=60)
    ws: Workspace = g.workspace
    g.db_session.delete(ws)
    g.db_session.commit()
    return "", 204
