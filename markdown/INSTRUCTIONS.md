# INSTRUCTIONS.md — Developer & Agent Operating Manual

This manual governs all engineering work performed on **ResumeIQ** across phases `PHASE 0` through `PHASE 14`.

---

## 1. Mandatory Pre-Work Rules

1. **Inspect Before Editing:** Read target files, schemas, and related docs before modifying code. Never overwrite existing code blindly.
2. **Respect Phase Gates:** Follow the sequence in `PROJECT_IMPLEMENTATION.md`. Do not jump ahead to UI polish or optional AI integrations before database schemas, API contracts, and deterministic engines are verified.
3. **One Canonical Implementation:** Never create duplicate backend apps, duplicate frontend components, or competing configuration files.

---

## 2. Coding Standards

### Python / Backend (`backend/`)
- **Separation of Concerns:** Keep `parsers/`, `nlp/`, and `scoring/` pure Python functions/classes independent of Flask `Request` and SQLAlchemy `Session`.
- **Typing & Validation:** Use Python 3.11+ type annotations (`from __future__ import annotations` where helpful) and strict Pydantic v2 DTOs for all inputs/outputs.
- **No Silent Failures:** Raise typed domain exceptions (e.g., `ScannedPdfError`, `CorruptedDocumentError`, `UnsupportedFileTypeError`) and translate them cleanly into structured HTTP responses.
- **Resource Cleanup:** Always extract uploaded files inside `tempfile.TemporaryDirectory()` with `try/finally` cleanup guarantees.

### TypeScript / Frontend (`frontend/`)
- **Strict TypeScript:** `strict: true`, zero `any` escape hatches for API payloads; mirror schemas in `src/types/`.
- **UI Logic Separation:** Keep API fetching, transformations, and score formatting outside presentational components (`src/services/` and custom hooks).
- **Design Discipline:** Consume semantic CSS tokens from `DESIGN.md`; never hardcode arbitrary hex colors or random gradient strings inside feature components.
- **Accessibility Mandatory:** All interactive elements keyboard-focusable (`focus-visible`), `4.5:1` minimum contrast for normal text, `aria-live` status updates on upload/parse, and `prefers-reduced-motion` support on all Framer Motion / GSAP / R3F animations.

---

## 3. Testing & Verification Discipline

- Every backend parser, scorer, and skill rule requires unit tests using synthetic in-memory/programmatic fixtures inside `backend/tests/`.
- Never commit real personal resumes to Git.
- **No Unverified Claims:** Never state *"tests pass"* or *"feature works"* unless the exact test command was run *after* the final edit and its observed output confirmed 100% pass without skipped assertions.
- Record milestone verification evidence in `markdown/docs/testing/`.

---

## 4. Documentation Synchronization

Whenever a feature alters any of the following, update the corresponding documentation in the same change set:
- Endpoint path or payload -> `API.md` & `docs/api/openapi-draft.yaml`
- Table, column, or index -> `DATABASE.md`, `markdown/docs/database/er-diagram.md`, and Alembic migration
- Scoring weight or rule -> `DATABASE.md` & `markdown/docs/database/scoring-rubric-spec.md`
- Env variable -> `.env.example`, `DEPLOYMENT.md`, `markdown/docs/deployment/hosting-and-env-checklist.md`
- Release / milestone -> `CHANGELOG.md` & `BRAIN.md`
