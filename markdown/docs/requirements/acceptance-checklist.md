# Master Acceptance Checklist

Used by **QA Engineer** and **Primary Orchestrator** across Phases 2–14.

---

## Phase 1 — Documentation & Planning (Current Gate)
- [x] Workspace audited (`C:\Users\KhaleelLocal\.gemini\antigravity\scratch\resumeiq` verified clean).
- [x] All 25 root `.md` documents authored with cross-consistent contracts and zero empty stubs.
- [x] All 11 supporting directories populated (`requirements`, `design`, `architecture`, `database`, `api`, `testing`, `deployment`, `adr`, `rules`, `workflows`, `specialists`).
- [x] All 8 specialist files define Responsibilities, Scope, Inputs, Outputs, Constraints, Quality Checks, Handoffs.
- [ ] User review & sign-off on Phase 2 open questions (`ADR-001`, production DB host, Phase 9 HF scope).

## Phase 3–4 — Frontend Shell, Backend Foundation & Security Baseline
- [x] Obsidian design tokens & typography (`Inter` + `JetBrains Mono`) implemented with skip link, focus rings, and WCAG AA contrast.
- [x] Server-issued cryptographic workspace session tokens (`POST /api/workspaces/session`, SHA-256 `token_hash`), ownership guard, and cascade purge verified via `pytest`.
- [x] Alembic initial migration (`96cd3747957a`), 4 mandatory role seeds, 2 synthetic samples, and PostgreSQL DDL compilation verified.
- [x] Punctuation-sensitive skill matcher (`C`, `C++`, `C#`, `R`, `Go`, `JavaScript`) and exception-safe `ephemeral_upload_path()` cleanup unit-tested.
- [x] Lazy 3D Hero Prism (`<= 6,000` tris) + static SVG fallback on reduced-motion/mobile verified via `Vitest` and `vite build`.

## Phase 5 — Resume Upload & Parsing Engine (Complete)
- [x] Magic-byte validation rejects spoofed `.pdf`/`.docx` (`415`), oversized `>5 MB` (`413`), encrypted (`422`), ZIP-bombs (`422`), macros (`415`), and path traversal (`422`).
- [x] Scanned image-only PDF emits `422 SCANNED_PDF_DETECTED`, never silent 0-score pass or fabricated content.
- [x] `PyMuPDF` multi-column detection & `python-docx` paragraph + table + header extraction emit deterministic layout warnings and confidence scores.
- [x] `PATCH /api/resumes/:id/versions/:versionId` updates reviewed sections while preserving immutable `raw_text`.
- [x] Ephemeral temp upload directory verified empty on success, rejection, and simulated exception; cross-workspace reads/edits/deletes return `404` and sample mutations return `403`.
- [x] Upload Dropzone & Editable Parse Preview UI verified via `Vitest` (`5/5`) and `vite build` (`0` npm audit vulnerabilities).
- [ ] Chrome DevTools browser screenshots (blocked by unavailable `chrome_devtools` MCP connection in environment).

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
