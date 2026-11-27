# PROJECT_IMPLEMENTATION.md — 14-Phase Execution Plan

**Target Submission Deadline:** 28 December 2026 (SkillOrbit Capstone)  
**Start Date:** 26 November 2026 (**32 calendar days total**)

---

## 1. Phase Sequence & Milestones

| Phase | Name | Target Window | Primary Owners | Exit Gate |
|---|---|---|---|---|
| **PHASE 0** | Workspace audit & SkillOrbit verification | Day 1 *(Complete)* | Orchestrator, PM | Verified SkillOrbit PDF requirements, scope, toolchain (`Python 3.13.17` / `Node v26.13.1` / `Git 2.56.1`), Neon/Render limits, traceability matrix ([phase-0-completion-report.md](docs/requirements/phase-0-completion-report.md)). |
| **PHASE 1** | Documentation & governance suite | Day 1 *(Complete)* | All Specialists | Root `README.md` + `markdown/` specification suite audited (`0` broken relative links) ([phase-1-completion-report.md](docs/requirements/phase-1-completion-report.md)). |
| **PHASE 2** | Architecture & DB sign-off | Day 1–2 *(Complete & Signed Off)* | Architect, DB, Security | Finalized **Flask + Pydantic v2 + SQLAlchemy + Neon/SQLite** (`ADR-001`–`004`), 10-table ER diagram, OpenAPI contract, deterministic 100-pt rubric, [phase-2-signoff.md](docs/requirements/phase-2-signoff.md). |
| **PHASE 3** | Design prototypes & frontend shell | Day 2–4 *(Complete)* | UI/UX, Frontend | Obsidian prototypes ([docs/design/prototypes/](../docs/design/prototypes/index.html)), React 18.3 / Vite 8.4 shell, WCAG AA `ConfirmDialog`, lazy 3D prism w/ WebGL context-loss & reduced-motion fallback verified in Vitest & Playwright ([phase-3-completion-report.md](docs/requirements/phase-3-completion-report.md)). |
| **PHASE 4** | Backend foundation & database | Days 5–7 *(Complete)* | Backend, DB | Flask app factory, Pydantic v2, 10 ORM models, Alembic `96cd3747957a` (`upgrade`/`downgrade`/`upgrade` + PG DDL compile), 4 role seeds, 2 synthetic samples, server-issued `token_hash` auth, rate limit, expired-workspace purge ([phase-4-completion-report.md](docs/requirements/phase-4-completion-report.md)). |
| **PHASE 5** | Resume parsing engine | Days 8–10 *(Complete)* | Backend, AI/NLP, Security | Magic-byte/MIME binary sniffing, 5 MB file limit w/ multipart overhead tolerance, bounded streaming OOXML ZIP-bomb & XXE guards, `PyMuPDF` + `python-docx` extraction, vector/scanned PDF `422`, masked contact URLs, editable Parse Preview UI (`PATCH` recomputing derived fields), verified end-to-end in `pytest`, `Vitest`, and live Playwright Chromium ([phase-5-completion-report.md](docs/requirements/phase-5-completion-report.md)). |
| **PHASE 6** | Resume builder (MVP) | Days 11–13 | Frontend, Backend, UI/UX | Student onboarding, structured editable sections, live paper preview, **2 ATS-safe templates**, ReportLab PDF export, versioning, 1-click Analyze handoff. *(DOCX deferred.)* |
| **PHASE 7** | Scoring & ATS engine | Days 14–16 | AI/NLP, Backend | Deterministic student-fair 100-pt Quality Engine + ATS Estimate + formatting warnings; unit tests proving zero experience penalty for strong freshers. |
| **PHASE 8** | Role-based skill matching | Days 17–19 | AI/NLP, DB | Punctuation-safe `spaCy PhraseMatcher` + `C`/`R`/`Go`/`JavaScript` disambiguation, 4 mandatory roles, Custom JD extractor, Skill Gap UI + evidence drawer. |
| **PHASE 9** | Feedback engine & optional HF benchmark | Days 20–21 | AI/NLP, Security | Rule-based prioritized recommendations + template bullet coaching (`[metric]` placeholders). Optional local CPU benchmark script (`ENABLE_HF_EMBEDDINGS=false` in prod). |
| **PHASE 10** | Dashboard & PDF reports | Days 22–23 | Frontend, Backend | Interactive Recharts Workspace (`/results/:id`), version delta view (`/history`), ReportLab downloadable PDF report matching dashboard state. |
| **PHASE 11** | Security & privacy review | Day 24 | Security, Backend | Full audit: upload size/magic bytes/zip-bomb checks, `X-Workspace-Token` isolation, PII-free logs, CORS, rate limit, `pip-audit` / `npm audit`. |
| **PHASE 12** | Automated testing & QA | Days 25–27 | QA, Frontend, Backend | Full `pytest`, `Vitest`, and `Playwright` responsive (`375px`/`768px`/`1440px`), keyboard, and reduced-motion verification logged in `markdown/docs/testing/`. |
| **PHASE 13** | Deployment & production verification | Days 28–29 | Backend, QA | Verify Neon free-tier limits, run `alembic upgrade head`, deploy Flask on Render + React on Vercel; verify live E2E upload, builder, analysis, PDF export, and delete. |
| **PHASE 14** | Final documentation & demo prep | Days 30–32 | Docs, PM | Update `CHANGELOG.md`, `README.md`, finalize SkillOrbit Project Report, PPT slides, and Demo Video ahead of **28 Dec 2026**. |
