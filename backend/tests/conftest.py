from __future__ import annotations

import pytest

from app import create_app


@pytest.fixture()
def app():
    """Create an isolated in-memory SQLite Flask application for testing."""
    application = create_app(
        {
            "TESTING": True,
            "DATABASE_URL": "sqlite:///:memory:",
            "CREATE_TABLES_ON_INIT": True,
            "AUTO_SEED_CORE": True,
            "CORS_ORIGINS": ["http://localhost:5173"],
        }
    )
    yield application
    engine = application.config["DB_ENGINE"]
    engine.dispose()


@pytest.fixture()
def client(app):
    """Return a Flask test client bound to the isolated test app."""
    return app.test_client()


@pytest.fixture()
def db_session(app):
    """Yield a clean SQLAlchemy session bound to the isolated test app."""
    factory = app.config["DB_SESSION_FACTORY"]
    session = factory()
    try:
        yield session
        session.commit()
    finally:
        session.close()
