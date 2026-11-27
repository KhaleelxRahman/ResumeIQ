from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    """Declarative base shared across all ResumeIQ ORM models and Alembic."""


def build_engine(database_url: str) -> Engine:
    """Create a cross-dialect SQLAlchemy 2.0 engine tuned for SQLite dev and Neon Postgres."""
    is_sqlite = database_url.startswith("sqlite")
    kwargs: dict[str, object] = {
        "future": True,
        "pool_pre_ping": True,
    }

    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
        if database_url.endswith(":memory:") or ":memory:" in database_url:
            kwargs["poolclass"] = StaticPool
    else:
        # Neon free tier auto-suspends after 5 minutes of inactivity.
        kwargs["pool_recycle"] = 240

    engine = create_engine(database_url, **kwargs)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Return a configured sessionmaker bound to the active engine."""
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    """Transactional session scope with automatic rollback on exceptions."""
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
