# Phase 2 Architecture & Database Sign-Off Report

**Date:** 2026-11-26  
**Status:** Ready for Final User Go-Ahead to Enter Implementation Phases 4–14

---

## 1. SkillOrbit Assignment Verification Check
Re-verified Pages 1–8 of the attached SkillOrbit AI Capstone PDF against all 5 approved product & engineering decisions:
1. **Backend (`Python Flask`):** SkillOrbit explicitly recommends `Backend: Python Flask` (p. 6). Reconciled in `ADR-001`: Flask `3.x` + Pydantic v2 + SQLAlchemy `2.0` + Alembic gives verbatim SkillOrbit alignment while keeping `parsers/`, `nlp/`, `scoring/`, and `reports/` pure Python and framework-independent.
2. **No-Deep-Learning Rule (`p. 7`):** Every score (`0–100`), ATS estimate (`0–100`), skill match, and recommendation uses deterministic rules, `PyMuPDF`, `python-docx`, `spaCy en_core_web_sm`, and `NLTK`. `Qwen` LLMs and paid external inference are excluded from core; `ENABLE_HF_EMBEDDINGS` defaults to `false`.
3. **Database (`Neon PostgreSQL` + `SQLite`):** Neon verified free tier (`1 GB` storage, `100 CU-hrs/mo`, 5-min auto-suspend mitigated via `pool_pre_ping=True`, `5 GB` egress) avoids ephemeral Render disk wipeouts while SQLite powers zero-config local tests. *(Note: SkillOrbit p. 6 suggests SQLite/MySQL; Neon Postgres is documented transparently as an upgraded persistent SQLAlchemy choice.)*
4. **Resume Builder MVP:** Locked to **2 ATS-safe templates** (*Swiss Technical*, *Academic Editorial*), editable sections, version snapshots, and ReportLab PDF export; DOCX export cleanly deferred until core Analyzer + Reports + QA pass.

---

## 2. Signed-Off Artifacts
- **Architecture:** [ARCHITECTURE.md](../../ARCHITECTURE.md) & [system-architecture.md](../architecture/system-architecture.md)
- **Database & ER Diagram:** [DATABASE.md](../../DATABASE.md) & [er-diagram.md](../database/er-diagram.md) (`10` tables, `ON DELETE CASCADE`, composite indexes)
- **Scoring Specification:** [scoring-rubric-spec.md](../database/scoring-rubric-spec.md)
- **API Contracts:** [API.md](../../API.md) & [openapi-draft.yaml](../../../docs/api/openapi-draft.yaml)
- **ADRs:** `ADR-001` through `ADR-004` under `markdown/docs/adr/`
- **Phase 3 Visual Prototypes & 3D Budget:** [3d-performance-budget.md](../design/3d-performance-budget.md) & [prototypes/index.html](../../../docs/design/prototypes/index.html)
