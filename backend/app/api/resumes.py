from __future__ import annotations

from uuid import UUID

from flask import Blueprint, Response, current_app, g, jsonify, request

from app.api.auth_workspace import ApiError, require_workspace
from app.api.rate_limit import enforce_rate_limit
from app.models.entities import Workspace
from app.schemas.contracts import (
    CreateBuilderResumeRequestDTO,
    SaveBuilderVersionRequestDTO,
    UpdateParsedVersionRequestDTO,
)
from app.services.resume_service import (
    create_builder_resume,
    create_builder_version,
    delete_workspace_resume,
    export_resume_version_pdf,
    get_resume_detail,
    list_workspace_resumes,
    parse_and_persist_upload,
    update_parsed_version,
)

resumes_bp = Blueprint("resumes", __name__, url_prefix="/resumes")


def _parse_uuid(raw_id: str, label: str = "Identifier") -> UUID:
    try:
        return UUID(raw_id)
    except ValueError as exc:
        raise ApiError(400, "INVALID_UUID", f"{label} must be a valid UUID.") from exc


@resumes_bp.post("/upload")
@require_workspace
def upload_resume():
    """Upload a PDF or DOCX resume, extract & normalize content, and discard temp binary."""
    cfg = current_app.config["APP_CONFIG"]
    enforce_rate_limit("resume_upload", cfg.RATE_LIMIT_UPLOAD_PER_MIN, window_seconds=60)

    if "file" not in request.files:
        raise ApiError(400, "MISSING_FILE", "Multipart form field 'file' is required.")

    file_storage = request.files["file"]
    title_override = request.form.get("title")
    ws: Workspace = g.workspace

    detail = parse_and_persist_upload(
        session=g.db_session,
        workspace=ws,
        file_storage=file_storage,
        title_override=title_override,
        max_bytes=cfg.MAX_UPLOAD_BYTES,
        max_workspace_resumes=cfg.MAX_RESUMES_PER_WORKSPACE,
    )
    return jsonify(detail.model_dump(mode="json")), 201


@resumes_bp.get("")
@require_workspace
def list_resumes():
    """List resumes owned by the authenticated workspace (plus optional samples)."""
    include_samples = request.args.get("include_samples", "true").lower() not in {"0", "false", "no"}
    ws: Workspace = g.workspace
    items = list_workspace_resumes(g.db_session, ws, include_samples=include_samples)
    return jsonify({"resumes": [item.model_dump(mode="json") for item in items]}), 200


@resumes_bp.get("/<string:resume_id>")
@require_workspace
def get_resume(resume_id: str):
    """Retrieve parsed resume detail and editable sections for owned resume or sample."""
    parsed_id = _parse_uuid(resume_id, "Resume ID")
    raw_version_id = request.args.get("version_id")
    parsed_version_id = _parse_uuid(raw_version_id, "Version ID") if raw_version_id else None
    ws: Workspace = g.workspace
    detail = get_resume_detail(g.db_session, ws, parsed_id, version_id=parsed_version_id)
    return jsonify(detail.model_dump(mode="json")), 200


@resumes_bp.post("/builder")
@require_workspace
def create_builder_document():
    """Create a structured resume draft (v1) from the Student Resume Builder."""
    cfg = current_app.config["APP_CONFIG"]
    enforce_rate_limit("resume_builder", cfg.RATE_LIMIT_UPLOAD_PER_MIN, window_seconds=60)

    raw_json = request.get_json(silent=True)
    if raw_json is None or not isinstance(raw_json, dict):
        raise ApiError(400, "INVALID_JSON", "A valid JSON request body is required.")

    dto = CreateBuilderResumeRequestDTO.model_validate(raw_json)
    ws: Workspace = g.workspace
    created = create_builder_resume(
        session=g.db_session,
        workspace=ws,
        dto=dto,
        max_workspace_resumes=cfg.MAX_RESUMES_PER_WORKSPACE,
    )
    return jsonify(created.model_dump(mode="json")), 201


@resumes_bp.post("/<string:resume_id>/versions")
@require_workspace
def create_version_snapshot(resume_id: str):
    """Save a new immutable numbered version snapshot (v2, v3, ...) of a resume."""
    cfg = current_app.config["APP_CONFIG"]
    enforce_rate_limit("resume_builder", cfg.RATE_LIMIT_UPLOAD_PER_MIN, window_seconds=60)

    parsed_resume_id = _parse_uuid(resume_id, "Resume ID")
    raw_json = request.get_json(silent=True)
    if raw_json is None or not isinstance(raw_json, dict):
        raise ApiError(400, "INVALID_JSON", "A valid JSON request body is required.")

    dto = SaveBuilderVersionRequestDTO.model_validate(raw_json)
    ws: Workspace = g.workspace
    created = create_builder_version(
        session=g.db_session,
        workspace=ws,
        resume_id=parsed_resume_id,
        dto=dto,
    )
    return jsonify(created.model_dump(mode="json")), 201


@resumes_bp.get("/<string:resume_id>/versions/<string:version_id>/export")
@require_workspace
def export_resume_version(resume_id: str, version_id: str):
    """Stream an ATS-safe ReportLab PDF for the specified saved resume version."""
    parsed_resume_id = _parse_uuid(resume_id, "Resume ID")
    parsed_version_id = _parse_uuid(version_id, "Version ID")
    fmt = (request.args.get("format") or "pdf").strip().lower()
    if fmt == "docx":
        cfg = current_app.config["APP_CONFIG"]
        if not cfg.ENABLE_DOCX_BUILDER_EXPORT:
            raise ApiError(
                400,
                "FORMAT_DEFERRED",
                "DOCX builder export is intentionally deferred until core QA passes. Export PDF instead.",
                {"format": fmt},
            )
    if fmt != "pdf":
        raise ApiError(
            400,
            "UNSUPPORTED_EXPORT_FORMAT",
            "Only format=pdf export is supported in the current milestone.",
            {"format": fmt},
        )

    ws: Workspace = g.workspace
    pdf_bytes, download_name = export_resume_version_pdf(
        session=g.db_session,
        workspace=ws,
        resume_id=parsed_resume_id,
        version_id=parsed_version_id,
    )
    return Response(
        pdf_bytes,
        status=200,
        mimetype="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
            "Cache-Control": "no-store",
        },
    )


@resumes_bp.patch("/<string:resume_id>/versions/<string:version_id>")
@require_workspace
def patch_parsed_version(resume_id: str, version_id: str):
    """Save reviewed edits to parsed resume sections while preserving original raw_text."""
    parsed_resume_id = _parse_uuid(resume_id, "Resume ID")
    parsed_version_id = _parse_uuid(version_id, "Version ID")

    raw_json = request.get_json(silent=True)
    if raw_json is None or not isinstance(raw_json, dict):
        raise ApiError(400, "INVALID_JSON", "A valid JSON request body is required.")

    dto = UpdateParsedVersionRequestDTO.model_validate(raw_json)
    ws: Workspace = g.workspace
    updated = update_parsed_version(
        session=g.db_session,
        workspace=ws,
        resume_id=parsed_resume_id,
        version_id=parsed_version_id,
        dto=dto,
    )
    return jsonify(updated.model_dump(mode="json")), 200


@resumes_bp.delete("/<string:resume_id>")
@require_workspace
def delete_resume(resume_id: str):
    """Permanently delete a workspace-owned resume and cascade all versions/sections."""
    parsed_id = _parse_uuid(resume_id, "Resume ID")
    ws: Workspace = g.workspace
    delete_workspace_resume(g.db_session, ws, parsed_id)
    return "", 204
