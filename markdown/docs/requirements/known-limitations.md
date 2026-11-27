# Known Limitations & Deferred Scope (End of Phase 5)

Transparent engineering ledger documenting what is **not yet implemented**, **blocked in the current environment**, or **intentionally constrained** at the close of Phases 0–5.

---

## 1. Mandatory Capstone Modules Not Yet Implemented (`Phases 6–10`)

Phases 0–5 cover planning, foundation, upload, validation, extraction, and workspace security only:
- **Student Resume Builder MVP (`Phase 6` — `NOT IMPLEMENTED`):** `/builder` currently offers template switching preview UI (`Swiss Technical` vs `Academic Editorial`) without persistence routes (`POST /api/resumes/builder`, `POST /api/resumes/:id/versions`) or ReportLab PDF export. DOCX builder export remains intentionally deferred (`ENABLE_DOCX_BUILDER_EXPORT=false`).
- **Deterministic Quality Score `0–100` (`Phase 7` — `NOT IMPLEMENTED`):** `app/scoring/` does not exist yet; rubric weights are specified in [scoring-rubric-spec.md](../database/scoring-rubric-spec.md).
- **ATS Compatibility Estimate & Role Matching API (`Phases 7–8` — `NOT IMPLEMENTED`):** Only `app/nlp/skill_matcher.py` and the 4 seeded `/api/job-roles` endpoints exist. `POST /api/analyses`, `POST /api/job-descriptions/extract`, and `spaCy`/`NLTK` integrations are pending Phases 7–8.
- **Smart Deterministic Feedback (`Phase 9` — `NOT IMPLEMENTED`):** Rule-based recommendation generation is pending Phase 9.
- **Interactive Dashboard, History Comparison & ReportLab PDF Audits (`Phase 10` — `NOT IMPLEMENTED`):** `/results/:analysisId` and `/history` display Phase 10 scope notices; `recharts` and `reportlab` are not installed yet.

---

## 2. Environment-Blocked Verifications (`BLOCKED`)

1. **Live Neon PostgreSQL Connection & Remote Render/Vercel Deployment (`BLOCKED`):**
   - No live Neon PostgreSQL `DATABASE_URL` or cloud deployment exists before Phase 13.
   - PostgreSQL compatibility is verified via SQLAlchemy `CreateTable` / `CreateIndex` DDL compilation in `pytest`; real network connection, SSL handshake, and `alembic upgrade head` against Neon remain pending Phase 13.
2. **Python CVE Scan (`pip-audit`) (`BLOCKED`):**
   - `pip check` verified zero broken Python package requirements, and `npm audit` reported `0` vulnerabilities, while `pip-audit` is not installed offline and awaits Phase 11 security audit.

> **Browser Automation Resolution Note:** `chrome_devtools` MCP remains unattached because the user's normal Chrome profile does not run remote debugging (`DevToolsActivePort` absent, intentionally left untouched). Live interactive browser verification across viewports, WebGL/fallback states, uploads, editing, dialogs, and keyboard navigation is **`COMPLETE`** via isolated **Playwright Chromium (`156.0.8078.4`)**.

---

## 3. Technical Boundaries & Design Trade-Offs (As Implemented)

- **No Server-Side OCR (`PyMuPDF` text extraction only):** Raster scans and vector-outlined PDFs with `< 60` alphanumeric characters and `>= 1` image or `>= 15` vector drawings intentionally return `422 SCANNED_PDF_DETECTED` instead of guessing or faking text.
- **In-Memory Single-Worker Rate Limiter (`app/api/rate_limit.py`):** `SlidingWindowRateLimiter` uses process-local synchronized deques without external Redis, matching the Render 512 MB `--workers 1 --threads 4 --worker-class gthread` deployment profile. Multi-worker deployments would require an external store.
- **Lazy `vendor-three` Chunk Size Warning (`> 500 kB` raw minified):** Removing unused `@react-three/drei` kept `vendor-three` purely to `three` + `@react-three/fiber` (`805.56 kB` minified / `212.83 kB` gzipped). Because `Three.js` core renderer alone exceeds Vite's `500 kB` raw warning limit and is strictly lazy-loaded (`React.lazy`) only on desktop `/` WebGL screens (never on mobile, reduced motion, or studio routes), dependencies are kept cohesive in one async chunk (`76.8 kB` gzip initial shell JS).
- **Masked Social URLs Without Recoverable Cleartext Display:** `masked_contact_json` redacts slugs/handles/domains (`linkedin.com/in/r***`, `github.com/r***`, `p***.r***.dev/***`) to prevent PII exposure via API metadata; users view or edit full unmasked contact text inside the `header_contact` editable section block or immutable `raw_text` drawer inside their authenticated workspace.
