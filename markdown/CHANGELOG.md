# CHANGELOG.md

All notable changes to **ResumeIQ** are documented here using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) formatting.

---

## [0.5.0-phase5-hardening] — 2026-11-27

### Hardened & Verified (Phase 0–5 Master Completion)
- **Backend Config, Rate Limiting & Workspace Retention (`app/config.py`, `run.py`, `app/api/rate_limit.py`, `app/api/auth_workspace.py`, `app/__init__.py`):** Removed hardcoded `debug=True` in `run.py`, updated `APP_VERSION` to `"0.5.0-phase5"`, added per-app `SlidingWindowRateLimiter` (`429` w/ `Retry-After`) + `MAX_RESUMES_PER_WORKSPACE` quota (`429`), added `purge_expired_workspaces()` + `flask --app run.py purge-expired-workspaces` CLI command, and enabled `PRAGMA foreign_keys=ON` inside `alembic/env.py` SQLite connections.
- **Upload & OOXML Boundary Hardening (`app/parsers/detector.py`, `app/services/resume_service.py`):** Separated `MAX_UPLOAD_BYTES` (`5 MB` exact file cap) from `MAX_CONTENT_LENGTH` (`5 MB + 256 KB` multipart overhead) so exact `5.00 MB` uploads succeed cleanly; replaced central-directory-only checks with bounded streaming ZIP entry reads covering small (`>= 4 KB`) and large entries, XXE/DOCTYPE blocking, encrypted ZIP rejection, and binary signature sniffing independent of HTTP `Content-Type`.
- **PDF & DOCX Extraction Hardening (`app/parsers/pdf_parser.py`, `docx_parser.py`):** Fixed `docx_parser._extract_table_lines` `id(cell._tc)` CPython proxy-recycling bug by holding direct `CT_Tc` references in a set, preventing silent table-row skips; added vector-outlined non-selectable PDF detection (`SCANNED_PDF_DETECTED`).
- **Frontend 3D Context Loss & Budget Alignment (`HeroVisualStage.tsx`, `HeroPrismCanvas.tsx`, `package.json`):** Aligned 3D stage height to `min-h-[420px]`, added `webglcontextlost`/`webglcontextrestored` fallback overlay handling & geometry/material disposal cleanup, uninstalled unused `@react-three/drei` (`53` packages removed, `0` npm vulnerabilities), and recorded actual chunk measurements.
- **Documentation & Phase 0–5 Signoff Suite (`README.md`, `markdown/`, `docs/api/openapi-draft.yaml`):** Reconciled `ARCHITECTURE.md`, `TRD.md`, `DEPLOYMENT.md`, `API.md`, `DATABASE.md`, `BRAIN.md`, `acceptance-checklist.md`, and `compliance-matrix.md`; added `traceability-matrix.md`, `known-limitations.md`, and Phase 0–5 completion reports under `markdown/docs/requirements/`.
- **Live Playwright Chromium E2E Signoff:** Verified responsive layout (`1440x900`, `768x1024`, `375x812`), WebGL 3D rendering + context-loss/unsupported/reduced-motion fallbacks, keyboard Dropzone (`Tab`/skip-link & `Enter`), PDF/DOCX uploads with warnings & PII masking, invalid/spoofed/`>5 MB` rejections, section editing & `PATCH` reload persistence w/ immutable `raw_text`, and accessible `alertdialog` Delete/Purge flows with `0` console, page, or unexpected HTTP errors.

## [0.4.1-p0-remediation] — 2026-11-27

### Security, Data Integrity & Accessibility Fixes (Phase 0–5 P0 Remediation)
- **PATCH Integrity (`app/schemas/contracts.py`, `app/services/resume_service.py`):** Removed `structured_payload` from `UpdateParsedVersionRequestDTO` (`extra="forbid"` returns `400 VALIDATION_ERROR` on override attempts) and recalculated derived `skills`, `word_count`, `contact_flags_json`, and `masked_contact_json` from edited sections while keeping original `raw_text` immutable.
- **Sample Seed Canonical Skills (`app/db/seed.py`, `app/api/samples.py`):** Wired `seed_core_data()` through `extract_structured_resume_entities` so seeded synthetic samples populate deduplicated canonical `skills` without duplicating rows (including idempotent backfill for pre-existing sample rows) and expose `skills` and `masked_contact` cleanly.
- **Complete Contact PII Masking (`app/parsers/entities.py`):** Added deterministic masking helpers for LinkedIn (`linkedin.com/in/r***`), GitHub (`github.com/r***`), and portfolio URLs (`p***.r***.dev/***`) alongside updated `+CC 5+5`/`10`-digit `_PHONE_RE` matching; rendered masked social contact values inside `EditableParsePreview.tsx`.
- **Frontend A11y & Destructive Confirmations (`frontend/src/components/ConfirmDialog.tsx`, `ResumeDropzone.tsx`, `EditableParsePreview.tsx`, `AnalyzePage.tsx`):** Eliminated nested keyboard tab stops inside `ResumeDropzone` (`tabIndex={-1}`, `aria-hidden="true"`, `className="hidden"` on internal file `<input>`) and added WCAG `role="alertdialog"` confirmation modals with focus trapping/restoration and `Escape` dismissal for `Delete Resume` and `Purge Workspace`.

## [0.4.0-phase5] — 2026-11-26

### Added & Verified (Phase 5 — Resume Upload & Parsing Engine)
- **Secure Validation & OOXML Safety (`app/parsers/detector.py`):** Implemented 5 MB upload ceiling (`413`), extension/MIME/magic-byte inspection (`%PDF-`, `PK\x03\x04`), OLE2 encrypted legacy check (`422`), macro rejection (`word/vbaProject.bin`, `415`), ZIP path-traversal blocking, and 25 MB / 250-entry / 120:1 ratio ZIP-bomb guards (`422`).
- **PDF & DOCX Extraction (`app/parsers/pdf_parser.py`, `docx_parser.py`, `normalizer.py`, `sectioner.py`, `entities.py`):** Added PyMuPDF coordinate-aware column reconstruction (`MULTI_COLUMN_LAYOUT`), image-only scanned PDF rejection (`422 SCANNED_PDF_DETECTED`), encrypted PDF detection (`422`), `python-docx` paragraph + merged-cell table + header/footer parsing, NFKC normalization, deterministic heading segmentation, masked contact signals, canonical skill extraction, confidence scoring, and strict non-invention of missing fields.
- **Resume Upload & Parse Preview API (`app/api/resumes.py`, `app/services/resume_service.py`):** Added `POST /api/resumes/upload`, `GET /api/resumes`, `GET /api/resumes/<id>`, `PATCH /api/resumes/<id>/versions/<vid>` (preserving immutable `raw_text` source), and `DELETE /api/resumes/<id>` with server-issued `X-Workspace-Token` ownership checks and unconditional temp cleanup.
- **Frontend Upload & Editable Preview (`frontend/src/features/studio/`):** Added accessible `ResumeDropzone` and `EditableParsePreview` in `AnalyzePage.tsx`; upgraded `vite` (`8.4.0`), `vitest` (`5.1.2`), and `react-router-dom` (`7.18.7`), eliminating all 8 prior npm audit vulnerabilities (`0 vulnerabilities`).

## [0.3.0-phase4] — 2026-11-26

### Added & Verified (Phase 4 — Backend & Frontend Foundation)
- **Backend Foundation (`backend/`):** Flask `3.1.3` application factory (`app/__init__.py`), environment config (`app/config.py`), SQLAlchemy `2.1.9` engine with SQLite `PRAGMA foreign_keys=ON` and Neon `pool_pre_ping=True`, 10 ORM models (`app/models/entities.py`), Alembic initial migration `96cd3747957a_initial_schema.py` verified via `upgrade`/`downgrade`/`upgrade` and PostgreSQL DDL compilation.
- **Server-Issued Workspace Sessions:** Added `workspaces` table storing SHA-256 `token_hash`, `POST /api/workspaces/session`, `GET/DELETE /api/workspaces/current`, and `assert_workspace_ownership` guard.
- **Seed & Domain Foundations:** Seeded all 4 mandatory SkillOrbit roles (`data-analyst`, `web-developer`, `ai-engineer`, `cloud-engineer`) and 2 synthetic samples (`app/db/seed.py`); implemented pure-Python `ephemeral_upload_path` (`app/parsers/storage.py`) and punctuation-sensitive deterministic matcher (`app/nlp/skill_matcher.py` covering `C`, `C++`, `C#`, `R`, `Go`, `JavaScript`, `Node.js`, `CI/CD`).
- **Frontend Foundation (`frontend/`):** React `18.3` + Vite `6.4.6` + TypeScript + Tailwind v4 Obsidian shell, 6 routes, `apiClient.ts` bound to server-issued sessions, lazy `HeroPrismCanvas` (`<= 6,000` tris) + `StaticPrismFallback`.
- **Verified Checks:** `pytest -v` (`14 passed in 0.53s`), `vitest run` (`2 passed`), `tsc -b && vite build` (`built in 8.28s`, core shell JS `65.45 kB` gzipped).

## [0.2.0-phase2-3] — 2026-11-26

### Changed & Signed Off (Phase 2 Architecture + Phase 3 Prototypes)
- **Backend Architecture (`ADR-001`):** Finalized **Python Flask 3.x + Pydantic v2 + SQLAlchemy 2.0 + Alembic + Gunicorn (`gthread`)** for 100% alignment with SkillOrbit's recommended stack while keeping parsing, NLP, scoring, and ReportLab engines completely framework-independent.
- **Database Selection (`ADR-003`):** Finalized **Neon PostgreSQL** as production DB candidate (verified current free-tier limits: `1 GB` storage, `100 CU-hrs/mo`, 5-min auto-suspend mitigated via `pool_pre_ping=True`) alongside local SQLite for dev/`pytest`.
- **AI/NLP Scope (`ADR-002`):** Locked 100% deterministic scoring, ATS estimates, skill matching, and feedback per SkillOrbit's no-deep-learning boundary; excluded Qwen LLMs and paid external inference from core; kept lightweight HF embeddings disabled by default (`ENABLE_HF_EMBEDDINGS=false`).
- **Resume Builder Scope:** Locked MVP to **2 premium ATS-safe templates** (*Swiss Technical Single-Column*, *Academic Editorial Crisp*), reliable ReportLab PDF export, editable sections, and versioning; deferred Builder DOCX export until core Analyzer, Reports, and QA pass.
- **Added Phase 2 Sign-Off & Phase 3 Design Deliverables:**
  - [phase-2-signoff.md](docs/requirements/phase-2-signoff.md)
  - [3d-performance-budget.md](docs/design/3d-performance-budget.md)
  - Interactive static HTML/CSS/SVG prototypes in [docs/design/prototypes/index.html](../docs/design/prototypes/index.html)

## [0.1.0-phase1] — 2026-11-26

### Added (Phase 0 & Phase 1)
- Workspace & local environment audit (`Python 3.13.17`, `Node v26.13.1`, `Git 2.56.1`, MCP inventory).
- Initial 25 root documents, supporting architecture/DB/API specs, ADRs, and 8 specialist agent instructions.
