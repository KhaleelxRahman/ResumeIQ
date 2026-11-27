# AGENTS.md — Multi-Agent Engineering Organization & Governance

This document defines the multi-agent engineering structure for **ResumeIQ**. Every agent operating in this repository must follow these coordination rules, ownership boundaries, and verification gates.

---

## 1. Organization Structure

ResumeIQ is governed by a **Primary Orchestrator** coordinating **8 Specialized Engineering Roles**:

| Specialist File | Role | Primary Domain Ownership |
|---|---|---|
| [product-manager.md](.agents/specialists/product-manager.md) | Product Manager | Scope integrity, SkillOrbit alignment, user stories, acceptance criteria (`PRD.md`, `MONETIZATION.md`) |
| [ui-ux-designer.md](.agents/specialists/ui-ux-designer.md) | UI/UX, Motion & 3D Designer | Design tokens, editorial layout, 3D Hero spec, accessibility standards (`DESIGN.md`, `ACCESSIBILITY.md`) |
| [frontend-engineer.md](.agents/specialists/frontend-engineer.md) | Senior React/TS Engineer | `frontend/` components, routes, state, Recharts, R3F integration, Vitest UI tests |
| [backend-engineer.md](.agents/specialists/backend-engineer.md) | Senior Python/Flask Engineer | `backend/app/api/`, services, PyMuPDF/`python-docx` parsers, ReportLab PDF generation |
| [ai-nlp-engineer.md](.agents/specialists/ai-nlp-engineer.md) | AI/ML & NLP Engineer | `backend/app/nlp/`, `scoring/`, skill taxonomies, Hugging Face model benchmarking & constraints |
| [database-architect.md](.agents/specialists/database-architect.md) | Database Architect | SQLAlchemy models, Alembic migrations, indexing, retention cascades (`DATABASE.md`) |
| [security-engineer.md](.agents/specialists/security-engineer.md) | Application Security Engineer | Upload validation, PII redaction, CORS, rate limiting, secret hygiene (`AUTHENTICATION_AND_SECURITY.md`) |
| [qa-engineer.md](.agents/specialists/qa-engineer.md) | QA Automation Engineer | `pytest`, Playwright E2E, synthetic fixtures, cross-browser & responsive checks (`TESTING_AND_QA.md`) |

---

## 2. Coordination & Non-Conflict Protocol

1. **Single-Writer Rule:** Two specialists must never edit the same file concurrently. Shared contract files (`API.md`, `docs/api/openapi-draft.yaml`, `DATABASE.md`, `CHANGELOG.md`) are updated strictly through orchestrator-reviewed sequential handoffs.
2. **Contract-First Handoff:**
   - Schema changes begin with `database-architect` -> reviewed by `backend-engineer` and `security-engineer`.
   - API changes update `API.md` + `docs/api/openapi-draft.yaml` *before* `frontend-engineer` builds client bindings.
   - Scoring weight changes update `DATABASE.md` + `markdown/docs/database/scoring-rubric-spec.md` *before* `ai-nlp-engineer` modifies scoring weights.
3. **No Silent Scope Creep:** Any feature outside the approved Phase roadmap requires updating `PRD.md` and `PROJECT_IMPLEMENTATION.md` first.
4. **Orchestrator Review Gate:** Before closing any phase (`PHASE 0` to `PHASE 14`), the Primary Orchestrator verifies:
   - Acceptance checklist items in `markdown/docs/requirements/acceptance-checklist.md`.
   - Actual test execution logs (never simulated or assumed).
   - Documentation synchronization across affected `.md` files.

---

## 3. Rules & Workflows References

- Core Engineering Rules: [markdown/.agents/rules/core-engineering-rules.md](.agents/rules/core-engineering-rules.md)
- File Ownership & Coordination: [markdown/.agents/rules/file-ownership-and-coordination.md](.agents/rules/file-ownership-and-coordination.md)
- Phase Gate Workflow: [markdown/.agents/workflows/phase-gate-workflow.md](.agents/workflows/phase-gate-workflow.md)
- Feature Implementation Workflow: [markdown/.agents/workflows/feature-implementation-workflow.md](.agents/workflows/feature-implementation-workflow.md)
