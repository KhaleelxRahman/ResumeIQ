# Known Limitations & Deferred Scope (End of Phase 6 Frontend)

Transparent engineering ledger documenting what is **not yet implemented**, **blocked in the current environment**, or **intentionally constrained** as of Phase 6 frontend completion.

---

## 1. Mandatory Capstone Modules Status (`Phases 6–10`)

- **Student Resume Builder MVP (`Phase 6` — `PARTIAL: Frontend Complete / Python Backend Blocked in AI Studio`):** Complete structured React Resume Builder (`/builder`), section editors, live paper preview (`swiss-technical` & `academic-editorial`), versioning (`v1`/`v2`), PDF export trigger, and `"Open in Builder"` handoff are implemented and verified against the Node `/api` compatibility layer (`server/`). DOCX builder export remains intentionally deferred (`ENABLE_DOCX_BUILDER_EXPORT=false`).
- **Deterministic Quality Score `0–100` (`Phase 7` — `NOT IMPLEMENTED`):** `app/scoring/` does not exist yet; rubric weights are specified in [scoring-rubric-spec.md](../database/scoring-rubric-spec.md).
- **ATS Compatibility Estimate & Role Matching API (`Phases 7–8` — `NOT IMPLEMENTED`):** Only `app/nlp/skill_matcher.py` and the 4 seeded `/api/job-roles` endpoints exist. `POST /api/analyses`, `POST /api/job-descriptions/extract`, and `spaCy`/`NLTK` integrations are pending Phases 7–8.
- **Smart Deterministic Feedback (`Phase 9` — `NOT IMPLEMENTED`):** Rule-based recommendation generation is pending Phase 9.
- **Interactive Dashboard, History Comparison & ReportLab PDF Audits (`Phase 10` — `NOT IMPLEMENTED`):** `/results/:analysisId` and `/history` display Phase 10 scope notices; `recharts` and `reportlab` are not installed yet.

---

## 2. Environment-Blocked Verifications (`BLOCKED`)

1. **Original Python Flask / SQLAlchemy / Alembic Backend Execution in AI Studio (`BLOCKED`):**
   - The AI Studio runtime migrated `/backend` to `/server` (Express + in-memory `Map` store + `pdfkit`) on port `3000`. Real SQLite/Neon PostgreSQL persistence, Alembic migrations, `PyMuPDF` self-parse checks, ReportLab PDF rendering, and `pytest` (`test_resume_builder.py`) cannot run inside this Node-only container and require running in the full-stack Python workspace.
   - Because `/server/store.ts` stores data in RAM only, saved Builder drafts survive browser reloads while the Node process stays alive, rather than across full server process restarts.
   - Because `/backend` is absent from this workspace, removing `samples_seed.json`, `/api/samples`, and the `resumes.is_sample` column (via a reversible Alembic migration) in the canonical Flask repository remains pending reconciliation in the Python repo.
2. **Live Neon PostgreSQL Connection & Remote Render/Vercel Deployment (`BLOCKED`):**
   - No live Neon PostgreSQL `DATABASE_URL` or cloud deployment exists before Phase 13.
   - PostgreSQL compatibility was previously verified via SQLAlchemy `CreateTable` / `CreateIndex` DDL compilation in `pytest`; real network connection, SSL handshake, and `alembic upgrade head` against Neon remain pending Phase 13.
3. **Python CVE Scan (`pip-audit`) (`BLOCKED`):**
   - `pip-audit` is unavailable offline in this container and awaits Phase 11 security audit in the Python environment.

> **Browser Automation Resolution Note:** `chrome_devtools` MCP remains unattached because the user's normal Chrome profile does not run remote debugging (`DevToolsActivePort` absent, intentionally left untouched). Live interactive browser verification across viewports, WebGL/fallback states, uploads, editing, dialogs, and keyboard navigation is **`COMPLETE`** via isolated **Playwright Chromium (`156.0.8078.4`)**.

---

## 3. Technical Boundaries & Design Trade-Offs (As Implemented)

- **No Server-Side OCR (`PyMuPDF` text extraction only):** Raster scans and vector-outlined PDFs with `< 60` alphanumeric characters and `>= 1` image or `>= 15` vector drawings intentionally return `422 SCANNED_PDF_DETECTED` instead of guessing or faking text.
- **In-Memory Single-Worker Rate Limiter (`app/api/rate_limit.py`):** `SlidingWindowRateLimiter` uses process-local synchronized deques without external Redis, matching the Render 512 MB `--workers 1 --threads 4 --worker-class gthread` deployment profile. Multi-worker deployments would require an external store.
- **Lazy `vendor-three` Chunk Size Warning (`> 500 kB` raw minified):** Removing unused `@react-three/drei` kept `vendor-three` purely to `three` + `@react-three/fiber` (`805.56 kB` minified / `212.83 kB` gzipped). Because `Three.js` core renderer alone exceeds Vite's `500 kB` raw warning limit and is strictly lazy-loaded (`React.lazy`) only on desktop `/` WebGL screens (never on mobile, reduced motion, or studio routes), dependencies are kept cohesive in one async chunk (`76.8 kB` gzip initial shell JS).
- **Masked Social URLs Without Recoverable Cleartext Display:** `masked_contact_json` redacts slugs/handles/domains (`linkedin.com/in/r***`, `github.com/r***`, `p***.r***.dev/***`) to prevent PII exposure via API metadata; users view or edit full unmasked contact text inside the `header_contact` editable section block or immutable `raw_text` drawer inside their authenticated workspace.
