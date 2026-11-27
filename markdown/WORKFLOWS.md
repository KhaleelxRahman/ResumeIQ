# WORKFLOWS.md — Product & Engineering Workflows

*(Agent execution workflows live under `markdown/.agents/workflows/`.)*

---

## 1. User Workflow A — Upload, Verify & Analyze Existing Resume

1. User enters `/analyze` and selects **Upload Resume** (or picks a pre-seeded synthetic sample).
2. Frontend checks `GET /api/health` quietly; if backend is cold-starting, displays warm-up state before upload.
3. User uploads `.pdf` or `.docx` (≤ 5 MB) → `POST /api/resumes/upload`.
4. **Parse Verification Gate:** User reviews extracted sections, contact flags, extraction confidence badges, and any `parse_warnings` (e.g., multi-column layout notice). User may edit misparsed headings (`PATCH /api/resumes/:id/versions/:versionId`).
   - *Branch on Scanned PDF:* If `SCANNED_PDF_DETECTED`, workflow stops cleanly with instructions to export a text-selectable PDF or upload DOCX.
5. User selects **Experience Track** (`Student / Fresher`, `Junior`, `Mid`) and either **Target Role** (4 core roles) or **Custom Job Description**.
6. `POST /api/analyses` runs deterministic Quality, ATS Estimate, Skill Matching, and Smart Feedback engines in one atomic transaction.
7. Browser navigates to `/results/:analysisId` where user inspects Overview, Quality Breakdown, ATS Warnings, Skill Gaps (clicking skills reveals exact resume evidence), and Action Plan, or downloads PDF via `GET /api/analyses/:id/report`.

---

## 2. User Workflow B — Student Resume Builder to Analyzer

1. User enters `/builder` and completes guided onboarding (target track + template selection).
2. User populates structured sections (Personal, Summary, Education, Skills, Projects, Internships/Experience, Certifications, Achievements, Languages) alongside a live scaled paper preview.
3. Saving persists `resume_versions` (`v1`, `v2`, ...) in DB via `POST /api/resumes/builder` or `POST /api/resumes/:id/versions`.
4. User exports crisp ATS-friendly PDF (`GET /api/resumes/:id/versions/:vid/export?format=pdf`) **or** clicks **Analyze Built Resume** → triggers `POST /api/analyses` directly without uploading anything!

---

## 3. User Workflow C — Iterative Improvement Tracking

1. Student applies Smart Feedback suggestions in `/builder` (saving `v2`) or uploads an updated PDF (`v2`).
2. Runs analysis against the same role.
3. `/history` compares `v1` vs `v2` across Quality Score, ATS Estimate, and Skill Match %, showing newly matched keywords and resolved warnings.

---

## 4. Engineering Delivery Workflow

1. Check `PROJECT_IMPLEMENTATION.md` for current active Phase.
2. Read relevant specialist instruction file in `markdown/.agents/specialists/`.
3. Apply contract-first updates (`DATABASE.md` / `API.md` → implementation → unit/integration tests → doc/changelog sync).
4. Execute verification tests (`pytest` / `Vitest` / `Playwright`) and log results in `markdown/docs/testing/`.
5. Complete Phase Gate review before advancing.
