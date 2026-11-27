from __future__ import annotations

import logging
from typing import Any

import click
from dotenv import load_dotenv
from flask import Flask, g
from flask_cors import CORS
from sqlalchemy import inspect

from app.api import register_api_blueprints
from app.config import AppConfig
from app.db.seed import seed_core_data
from app.extensions import Base, build_engine, create_session_factory, session_scope
from app.nlp.skill_matcher import load_skill_taxonomy


def create_app(config_override: dict[str, Any] | None = None) -> Flask:
    """Create and configure the ResumeIQ Flask application factory."""
    load_dotenv()
    cfg = AppConfig()
    if config_override:
        for key, value in config_override.items():
            if hasattr(cfg, key):
                setattr(cfg, key, value)

    app = Flask(__name__)
    app.config["APP_CONFIG"] = cfg
    app.config["TESTING"] = cfg.TESTING
    app.config["MAX_CONTENT_LENGTH"] = cfg.MAX_CONTENT_LENGTH

    logging.basicConfig(
        level=logging.INFO if not cfg.TESTING else logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": cfg.CORS_ORIGINS}},
        allow_headers=["Content-Type", "X-Workspace-Token"],
        expose_headers=["Content-Disposition"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    engine = build_engine(cfg.DATABASE_URL)
    session_factory = create_session_factory(engine)
    app.config["DB_ENGINE"] = engine
    app.config["DB_SESSION_FACTORY"] = session_factory

    # Preload deterministic canonical skill taxonomy once at boot.
    taxonomy = load_skill_taxonomy()
    app.config["NLP_TAXONOMY_LOADED"] = len(taxonomy) > 0

    if cfg.TESTING and config_override and config_override.get("CREATE_TABLES_ON_INIT"):
        from app import models as _models  # noqa: F401
        Base.metadata.create_all(bind=engine)

    if cfg.AUTO_SEED_CORE and inspect(engine).has_table("job_roles"):
        with session_scope(session_factory) as seed_session:
            seed_core_data(seed_session)

    @app.before_request
    def _open_request_session() -> None:
        g.db_session = session_factory()

    @app.teardown_request
    def _close_request_session(exc: BaseException | None = None) -> None:
        session = g.pop("db_session", None)
        if session is None:
            return
        if exc is not None:
            session.rollback()
        session.close()

    @app.cli.command("seed-db")
    def seed_db_command() -> None:
        """Seed the 4 mandatory SkillOrbit job roles and synthetic demo samples."""
        with session_scope(session_factory) as session:
            counts = seed_core_data(session)
        click.echo(f"Seed complete: {counts}")

    register_api_blueprints(app)
    return app
