# FEATURE_DEVELOPMENT.md — Feature Lifecycle, Flags & Expansion Rules

---

## 1. Feature Development Protocol

Every feature must clear five gates sequentially:
1. **Spec & Assignment Check:** Confirm alignment with `PRD.md`, SkillOrbit Scope Limitations (no deep learning / no fake AI), and `SYSTEM_INSTRUCTIONS.md`.
2. **Contract First:** Update `DATABASE.md` / Alembic migration and `API.md` / `docs/api/openapi-draft.yaml` before coding endpoints or UI.
3. **Pure Logic Isolation:** Implement business rules inside framework-agnostic `backend/app/parsers/`, `nlp/`, `scoring/`, or `reports/` before wiring Flask routes.
4. **Test Proof:** Add synthetic test cases covering valid paths, boundary/empty cases, and error states.
5. **UI & Docs Sync:** Verify keyboard/mobile responsiveness, loading/error states, and update `CHANGELOG.md`.

---

## 2. Feature Flags (`Environment-Driven`)

| Flag | Default | Purpose | Guardrail |
|---|---|---|---|
| `ENABLE_HF_EMBEDDINGS` | `false` | Optional offline CPU benchmark only (`all-MiniLM-L6-v2` / `bge-small-en-v1.5`) | Disabled in production core; must never alter deterministic 100-pt or ATS scores (`ADR-002`). |
| `ENABLE_DOCX_BUILDER_EXPORT` | `false` | Optional `.docx` export in Resume Builder | Deferred until core Analyzer, Reports, and QA pass Phase 12 (`PRD.md`). |
| `ENABLE_OPTIONAL_ROLES` | `false` | Optional roles beyond the 4 mandatory SkillOrbit roles | Enable only after core 4 roles + Custom JD pass full integration tests. |

---

## 3. Adding a Resume Builder Template

1. Every template (`swiss-technical`, `academic-editorial`) must use **single-column ATS-safe semantic layout** (no floating multi-column text boxes).
2. Run every generated ReportLab PDF back through ResumeIQ's own `PyMuPDF` parser (`self-parse confidence >= 0.95`) before release.
