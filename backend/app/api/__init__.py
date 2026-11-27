from __future__ import annotations

from flask import Blueprint, Flask, jsonify
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

from app.api.auth_workspace import ApiError
from app.api.health import health_bp
from app.api.resumes import resumes_bp
from app.api.roles import roles_bp
from app.api.samples import samples_bp
from app.api.workspaces import workspaces_bp
from app.parsers.detector import DocumentValidationError
from app.schemas.contracts import ErrorBody, ErrorEnvelope


def register_api_blueprints(app: Flask) -> None:
    """Mount /api root blueprint and register sanitized JSON error handlers."""
    api_bp = Blueprint("api", __name__, url_prefix="/api")
    api_bp.register_blueprint(health_bp)
    api_bp.register_blueprint(resumes_bp)
    api_bp.register_blueprint(workspaces_bp)
    api_bp.register_blueprint(roles_bp)
    api_bp.register_blueprint(samples_bp)
    app.register_blueprint(api_bp)

    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        envelope = ErrorEnvelope(
            error=ErrorBody(code=err.code, message=err.message, details=err.details)
        )
        return jsonify(envelope.model_dump(mode="json")), err.status_code

    @app.errorhandler(DocumentValidationError)
    def handle_document_validation_error(err: DocumentValidationError):
        envelope = ErrorEnvelope(
            error=ErrorBody(code=err.code, message=err.message, details=err.details)
        )
        return jsonify(envelope.model_dump(mode="json")), err.status_code

    @app.errorhandler(ValidationError)
    def handle_pydantic_error(err: ValidationError):
        envelope = ErrorEnvelope(
            error=ErrorBody(
                code="VALIDATION_ERROR",
                message="Request payload failed schema validation.",
                details={"issues": err.errors(include_url=False, include_input=False)},
            )
        )
        return jsonify(envelope.model_dump(mode="json")), 400

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(_err: RequestEntityTooLarge):
        max_bytes = app.config["APP_CONFIG"].MAX_CONTENT_LENGTH
        envelope = ErrorEnvelope(
            error=ErrorBody(
                code="FILE_TOO_LARGE",
                message=f"Uploaded payload exceeds the {max_bytes} byte maximum limit.",
                details={"max_bytes": max_bytes},
            )
        )
        return jsonify(envelope.model_dump(mode="json")), 413

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        envelope = ErrorEnvelope(
            error=ErrorBody(
                code=(err.name or "HTTP_ERROR").upper().replace(" ", "_"),
                message=err.description or "HTTP error occurred.",
            )
        )
        return jsonify(envelope.model_dump(mode="json")), err.code or 500

    @app.errorhandler(Exception)
    def handle_unexpected_exception(_err: Exception):
        app.logger.exception("Unhandled server error occurred (details redacted from response).")
        envelope = ErrorEnvelope(
            error=ErrorBody(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected internal server error occurred.",
            )
        )
        return jsonify(envelope.model_dump(mode="json")), 500
