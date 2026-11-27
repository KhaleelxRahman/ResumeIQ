# Phase 2 Completion Report — Architecture & Technology Decisions

**Status:** **`COMPLETE`** *(Signed off in [phase-2-signoff.md](phase-2-signoff.md); live Neon Postgres test deferred to Phase 13 `BLOCKED`)*

---

## 1. Verified Architectural Alignment (ADRs 001–004)

| Decision Record | Approved Choice | Verified Code Alignment |
|---|---|---|
| [`ADR-001`](../adr/ADR-001-fastapi-vs-flask.md) | Python Flask `3.1` + Pydantic v2 + SQLAlchemy `2.1` + Alembic (`gthread`) | `../../../backend/app/__init__.py` (`create_app`), Pydantic schemas in `app/schemas/contracts.py`; domain engines (`parsers/`, `nlp/`) import zero Flask or SQLAlchemy runtime objects. |
| [`ADR-002`](../adr/ADR-002-deterministic-nlp-and-hf-gating.md) | 100% deterministic NLP core; HF off by default; zero DL/LLM training | Pure deterministic matcher (`app/nlp/skill_matcher.py`) + regex/sectioner/PyMuPDF/python-docx; `ENABLE_HF_EMBEDDINGS=false`; `GET /api/health` confirms `"hf_mode": "disabled"`. |
| [`ADR-003`](../adr/ADR-003-ephemeral-privacy-and-persistence.md) | Server-issued `X-Workspace-Token` (`SHA-256` hash), `0s` binary retention, `10`-table Neon PG + SQLite | Verified in `app/models/entities.py` (`10` tables), `96cd3747957a_initial_schema.py`, `ephemeral_upload_path()`, and PG DDL compilation tests. |
| [`ADR-004`](../adr/ADR-004-frontend-stack-and-3d-budget.md) | React `18.3` + Vite `8.4` + TS strict + Tailwind v4 + lazy R3F (`<= 6k` tris) | Verified in `../../../frontend/package.json`, `vite.config.ts`, `HeroVisualStage.tsx`, `HeroPrismCanvas.tsx`, and `StaticPrismFallback.tsx`. |

---

## 2. Database & Neon Compatibility

- All `10` domain tables (`workspaces`, `resumes`, `resume_versions`, `resume_sections`, `job_roles`, `role_skills`, `job_descriptions`, `analyses`, `analysis_skill_matches`, `recommendations`) compile cleanly under SQLAlchemy's `postgresql.dialect()` (`CreateTable` & `CreateIndex`).
- **Honest Caveat:** Live Neon PostgreSQL network connection and remote migration were NOT performed in Phase 2–5 and remain scheduled for Phase 13.
