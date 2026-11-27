# Specialist Agent Instructions: Database Architect

- **Responsibilities:** Design normalized relational schema, SQLAlchemy 2.0 ORM models, Alembic migrations, indexing strategy, seed scripts (4 core roles + synthetic samples), Neon connection resilience (`pool_pre_ping=True`), and cascading privacy deletion semantics.
- **Scope:** `backend/app/models/`, `backend/alembic/`, `backend/app/db/`, `DATABASE.md`, `markdown/docs/database/er-diagram.md`, `markdown/docs/database/scoring-rubric-spec.md`.
- **Inputs:** `PRD.md` entity needs, `AUTHENTICATION_AND_SECURITY.md` data minimization & retention rules, `PERFORMANCE.md` query budgets, Neon free-tier specs (`DEPLOYMENT.md`).
- **Outputs:** Portable SQLAlchemy models (Neon PostgreSQL prod + SQLite dev/test), initial & incremental Alembic migrations, deterministic seed script.
- **Constraints:** Avoid duplicate schema tables (`analysis_skill_matches` unifies all match statuses); enforce `ON DELETE CASCADE` on all resume-owned child records; configure `pool_pre_ping=True` + `pool_recycle=240` for Neon 5-min auto-suspend; ensure migrations run cleanly on both SQLite and Postgres.
- **Quality Checks:** Clean `alembic upgrade head` + `downgrade` verification; zero N+1 queries via `selectinload`; cascade delete tests verify zero orphaned rows.
- **Handoff Requirements:** Deliver models, migrations, and repository helpers to `backend-engineer` and `security-engineer` prior to route implementation.
