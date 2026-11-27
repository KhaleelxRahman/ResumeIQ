from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify
from sqlalchemy import text

from app.schemas.contracts import HealthResponse

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def get_health():
    """Verify Flask readiness, database connectivity, and deterministic NLP state."""
    db_status = "ok"
    try:
        g.db_session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    cfg = current_app.config["APP_CONFIG"]
    payload = HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        db=db_status,
        nlp_ready=bool(current_app.config.get("NLP_TAXONOMY_LOADED", False)),
        hf_mode="enabled" if cfg.ENABLE_HF_EMBEDDINGS else "disabled",
        version=cfg.APP_VERSION,
        engine_version=cfg.ENGINE_VERSION,
    )
    status_code = 200 if db_status == "ok" else 503
    return jsonify(payload.model_dump(mode="json")), status_code
