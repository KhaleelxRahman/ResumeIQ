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
| `2026-11-27` | Phase 5 P0 | `.venv\Scripts\pytest.exe -v` | PATCH override rejection & derived recalculation, sample skill seed/backfill, PII URL/phone masking, Phase 4–5 regressions | `22 passed in 3.39s` | Executed in `ResumeIQ` clone (`:memory:` SQLite) |
| `2026-11-27` | Phase 5 P0 | `npm test && npm run build` | Single-tab-stop Dropzone a11y, `ConfirmDialog` for Delete/Purge, sample skills/masked URLs preview, `tsc -b` & Vite build | `7 passed` (Vitest, `2` files), `built in 1.53s` | Core initial JS `76.80 kB` gzip + `5.71 kB` CSS (`0` TS errors; lazy `vendor-three` chunk `212.83 kB` gzip) |
| `2026-11-27` | Phase 0–5 Master | `.venv\Scripts\pytest.exe -v` + `alembic` cycle | 5 MB multipart upload, small/multi-entry/spoofed ZIP bombs, XXE, MIME sniffing, vector PDF scan, rate limits, expired-workspace purge, `downgrade base && upgrade head` | `26 passed in 6.01s`; Alembic `96cd3747957a (head)` | Live HTTP `run.py` + `seed-db` verified (`200`/`201`/`204`) |
| `2026-11-27` | Phase 0–5 Master | `npm test && npm run build && npm audit --json` | Mobile `375px` SVG fallback, 6 routes, WebGL error & context-loss/restored fallback, Dropzone/ConfirmDialog, bundle budget | `10 passed` (`2` files, `8.89s`), `built in 1.73s`, `0 vulnerabilities` | Core JS shell `76.81 kB` gzip; lazy `vendor-three` `212.83 kB` gzip (`@react-three/drei` removed) |
| `2026-11-27` | Phase 0–5 Signoff | Playwright `1.64.1` Chromium `156.0.8078.4` (`127.0.0.1:5173` + `127.0.0.1:5000`) | Live E2E: `1440x900`/`768x1024`/`375x812`, 6 routes, WebGL/SVG/context-loss/reduced-motion, sample skills, keyboard Dropzone, `.txt`/`>5MB`/`415` spoof reject, PDF & DOCX table/header uploads, `PATCH` persistence + immutable `raw_text`, Delete & Purge `alertdialog` | `17/17` flow checks passed (`0` console errors, `0` page errors, `0` unexpected HTTP `>=400`) | Isolated browser context (`chrome_devtools` MCP unattached on default user Chrome profile) |
| `2026-11-27` | Phase 6 | `npx tsx --test frontend/src/features/builder/builderModel.test.ts` | Pure builder parser/serializer, deduplication, date/URL validation, template switch round-trip | `5/5` tests passed | Executed in workspace root |
| `2026-11-27` | Phase 6 | `npm test` + `npm run lint` + `npm run build` | `App.test.tsx`, `UploadAndPreview.test.tsx`, `Builder.test.tsx`, TS check, Vite build | `13/13` Vitest passed (`3` files); TS & Vite build clean | Re-verified after final layout polish |
| `2026-11-27` | Phase 6 | `playwright-cli` live Chromium (`http://localhost:3000`) | `/analyze` -> Open in Builder, duplicate sample, edit contact/skills/experience, reorder, switch templates, Save Draft, Save `v2`, Export PDF download, page reload persistence, `1440x900`/`768x1024`/`390x844` overflow & visual inspection | Passed (`0` console errors, `0` warnings, `sw === w` across all 3 viewports) | Verified against Node `/api` compatibility server (`Flask` `pytest` blocked in AI Studio) |

