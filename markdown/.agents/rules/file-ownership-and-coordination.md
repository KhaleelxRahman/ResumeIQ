# File Ownership & Multi-Agent Coordination Rules

## 1. Exclusive Directory Ownership

| Specialist | Primary Owned Paths |
|---|---|
| `product-manager` | `markdown/PRD.md`, `markdown/MONETIZATION.md`, `markdown/docs/requirements/` |
| `ui-ux-designer` | `markdown/DESIGN.md`, `markdown/ACCESSIBILITY.md`, `markdown/docs/design/`, `docs/design/prototypes/` |
| `frontend-engineer` | `frontend/` |
| `backend-engineer` | `backend/app/api/`, `backend/app/parsers/`, `backend/app/reports/`, `backend/app/services/`, `markdown/API.md` |
| `ai-nlp-engineer` | `backend/app/nlp/`, `backend/app/scoring/`, `backend/app/data/`, `markdown/TRD.md` |
| `database-architect` | `backend/app/models/`, `backend/alembic/`, `markdown/DATABASE.md`, `markdown/docs/database/` |
| `security-engineer` | `markdown/AUTHENTICATION_AND_SECURITY.md`, upload validators, CORS/rate-limit middleware |
| `qa-engineer` | `backend/tests/`, `frontend/tests/`, `markdown/TESTING_AND_QA.md`, `markdown/docs/testing/` |

## 2. Concurrency & Handoff Protocol

- **No Simultaneous Writes:** Two agents must never modify the same file in parallel. Shared docs (`markdown/BRAIN.md`, `markdown/CHANGELOG.md`, `markdown/API.md`) are committed sequentially via Orchestrator review.
- **Orchestrator Gate:** All cross-layer pull requests require verification that types (`frontend/src/types/`) match Pydantic schemas (`backend/app/schemas/`) and `docs/api/openapi-draft.yaml`.
