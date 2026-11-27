# Master Acceptance Checklist

Used by **QA Engineer** and **Primary Orchestrator** across Phases 2–14.

---

## Phase 1–2 — Documentation, Architecture & Governance
- [x] Repository audited (`C:\Users\KhaleelLocal\Desktop\GitHub Project Shortcuts\ResumeIQ`, `origin/main` connected).
- [x] Documentation suite organized (`README.md` at root + `59` Markdown specifications under `markdown/`, `0` broken relative links).
- [x] Supporting directories & 8 specialist specifications populated under `markdown/docs/` and `markdown/.agents/`.
- [x] Phase 2 architecture decisions signed off (`ADR-001` Flask, `ADR-002` deterministic core/HF off, `ADR-003` server-issued hashed sessions + 10-table SQLite/Neon Postgres, `ADR-004` React 18.3 / Vite 8.4 + lazy R3F budget).

## Phase 3–4 — Frontend Shell, Backend Foundation & Security Baseline
- [x] Obsidian design tokens & typography (`Inter` + `JetBrains Mono`) implemented with skip link, focus rings, and WCAG AA contrast.
- [x] Server-issued cryptographic workspace session tokens (`POST /api/workspaces/session`, SHA-256 `token_hash`), rate limiting (`429`), expired-workspace cleanup (`purge-expired-workspaces`), ownership guard, and cascade purge verified via `pytest`.
- [x] Alembic initial migration (`96cd3747957a` `upgrade`/`downgrade`/`upgrade`), 4 mandatory role seeds, 2 synthetic samples w/ canonical skills, and PostgreSQL DDL compilation verified.
- [x] Punctuation-sensitive skill matcher (`C`, `C++`, `C#`, `R`, `Go`, `JavaScript`) and exception-safe `ephemeral_upload_path()` cleanup unit-tested.
- [x] Lazy 3D Hero Prism (`min-h-[420px]`, `612` tris) w/ `webglcontextlost`/`restored` handling + static SVG fallback on reduced-motion/mobile verified via `Vitest` and `vite build`.

## Phase 5 — Resume Upload, Parsing & Hardening
- [x] Magic-byte/MIME binary sniffing rejects spoofed `.pdf`/`.docx`/`PNG`/`HTML`/`EXE` (`415`), >5 MB file size w/ multipart overhead headroom (`413`), encrypted PDF/DOCX (`422`), small/large & spoofed-header ZIP bombs + XML XXE bombs (`422`), macros (`415`), and path traversal (`422`).
- [x] Raster scanned & vector-outlined non-selectable PDFs emit `422 SCANNED_PDF_DETECTED`.
- [x] `PyMuPDF` multi-column detection & `python-docx` paragraph + table + header extraction emit deterministic layout warnings and confidence scores.
- [x] `PATCH /api/resumes/:id/versions/:versionId` forbids client `structured_payload` overrides (`400`), recalculates `skills`/`word_count`/`contact_flags`/`masked_contact` from edited sections, and preserves immutable `raw_text`.
- [x] Complete PII masking (`email`, `phone` incl. `+91` `5+5`, `linkedin`, `github`, `portfolio`), single-tab-stop `ResumeDropzone`, and accessible `ConfirmDialog` modals for `Delete Resume` and `Purge Workspace`.
- [x] Live Playwright Chromium (`156.0.8078.4`) browser E2E verification across `1440x900`, `768x1024`, and `375x812` viewports, WebGL/fallback states, PDF/DOCX uploads, section edits, delete/purge dialogs, and keyboard navigation (`0` console/page errors).

## Phase 6 — Student Resume Builder MVP (Next)
- [ ] Builder exports crisp PDF (2 ATS-safe templates) that parses back cleanly through ResumeIQ's own `PyMuPDF` parser (`>= 0.95` confidence).

## Phase 7–10 — Scoring, Role Matching, Feedback & Reporting
- [ ] Fresher synthetic resume with strong projects & zero jobs scores `>= 85/100`.
- [ ] Ambiguous tokens (`C`, `R`, `Go`, `Java` vs `JavaScript`) pass unit tests with zero false positives.
- [ ] All 4 mandatory roles (`Data Analyst`, `Web Developer`, `AI Engineer`, `Cloud Engineer`) + Custom JD mode work end-to-end.
- [ ] Missing keywords labeled *"Not detected in resume text"*; ATS labeled *"Estimate"*.
- [ ] ReportLab PDF download matches live dashboard scores, gaps, warnings, and action plan.

## Phase 11–14 — Security, QA, Deployment & Capstone Submission
- [ ] `X-Workspace-Token` prevents cross-session resume reads/deletions (`404`).
- [ ] Logs verified free of raw resume text, emails, phones, and tokens.
- [ ] Full `pytest`, `Vitest`, and `Playwright` checks pass on final commit and evidence logged in `markdown/docs/testing/`.
- [ ] Production Vercel + Render/Railway + Managed DB live test passes upload → analysis → PDF download → delete.
- [ ] SkillOrbit final deliverables (GitHub link, live URL, Project Report, PPT, Demo Video) complete before **28 Dec 2026**.
