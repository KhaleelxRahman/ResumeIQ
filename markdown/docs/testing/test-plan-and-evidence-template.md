# Testing Plan & Verification Evidence Log

> **Rule:** Never record passing tests until the command is actually executed in the workspace after the final edit.

---

## 1. Planned Synthetic Test Fixtures (Phase 5–12)

| Fixture ID | File Type | Purpose | Expected Outcome |
|---|---|---|---|
| `SYN-01` | PDF (1-col) | Strong Fresher Web Developer (projects, internships, GitHub, 0 full-time jobs) | Quality `>= 85`, Web Dev match `>= 75%` |
| `SYN-02` | DOCX (Tables) | Data Analyst resume with Skills/Education inside Word tables | Extracts table text cleanly without empty sections |
| `SYN-03` | PDF (2-col) | Two-column layout stress test | Extracts content + emits `MULTI_COLUMN_LAYOUT` ATS warning |
| `SYN-04` | PDF (Scanned) | Image-only scan with zero text layer | Rejects with `422 SCANNED_PDF_DETECTED` |
| `SYN-05` | Spoofed `.pdf` | Executable/text bytes renamed to `.pdf` | Rejects with `415 UNSUPPORTED_MEDIA_TYPE` |
| `SYN-06` | Edge NLP | Resume containing `JavaScript`, `PostgreSQL`, `"go to market"`, `"Grade C"` | Matches `JavaScript` (NOT `Java`), implies `SQL`, ignores false `Go`/`C` |

---

## 2. Verification Evidence Log Template

| Date | Phase | Command Executed | Scope | Observed Result | Notes |
|---|---|---|---|---|---|
| `2026-11-26` | Phase 0 | `python --version; node --version; git --version` | Local environment audit | `Python 3.13.17`, `Node v26.13.1`, `Git 2.56.1` | Verified clean `scratch/` directory |
| `2026-11-26` | Phase 4 | `alembic upgrade head && downgrade base && upgrade head` | SQLite migration & PostgreSQL DDL test | `96cd3747957a (head)` clean | Verified Neon Postgres `CreateTable` DDL via `pytest` |
| `2026-11-26` | Phase 4 | `.venv\Scripts\pytest.exe -v` | Backend health, DB, auth, matcher (`C/C++/C#/R/Go/JS`), temp cleanup | `14 passed in 0.53s` | Real isolated `:memory:` SQLite execution |
| `2026-11-26` | Phase 4 | `npm test && npm run build` | Frontend Vitest + `tsc -b` + Vite prod build | `2 passed` (Vitest), `built in 8.28s` | Core shell JS `65.45 kB` gzip; lazy `vendor-three` `220.80 kB` gzip |
| `2026-11-26` | Phase 5 | `.venv\Scripts\pytest.exe -v` | Synthetic PDF, DOCX tables, multi-col, scanned, encrypted, ZIP-bomb, cleanup, PATCH, cascade delete | `21 passed` | Executed after final code edit |
| `2026-11-26` | Phase 5 | `npm test && npm run build && npm audit` | Frontend Upload Dropzone & Parse Preview Vitest + Vite 8 build + security audit | `5 passed` (Vitest), `built in 923ms`, `0 vulnerabilities` | Core JS shell `75.94 kB` gzip + `5.57 kB` CSS |
| *(Pending)* | Phase 12 | `npx playwright test` | Cross-browser & responsive E2E | *Not run yet* | Scheduled for Phase 12 |
