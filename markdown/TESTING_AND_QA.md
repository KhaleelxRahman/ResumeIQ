# TESTING_AND_QA.md — Automated Testing & Quality Assurance Strategy

---

## 1. Testing Pyramid & Tooling

| Layer | Framework | Target Coverage Scope |
|---|---|---|
| **Domain & NLP Unit Tests** | `pytest` | File magic-byte detector, PyMuPDF block extraction, `python-docx` paragraph+table extraction, scanned PDF detection, heading taxonomy, short-token skill disambiguation (`C`, `R`, `Go`, `Java` vs `JavaScript`), 100-pt rubric determinism, ATS warnings, feedback rules. |
| **API & DB Integration Tests** | `pytest` + Flask `app.test_client()` + SQLite `:memory:` | Upload limits (`413`), spoofed files (`415`), scanned PDFs (`422`), `X-Workspace-Token` isolation (`404` cross-workspace access), analysis creation, PDF report MIME/header validity, cascade delete. |
| **Frontend Unit & Component Tests** | `Vitest` + `@testing-library/react` | Dropzone validation states, parse-preview editor, score badge contrast/labels, reduced-motion fallback rendering for 3D canvas, error banner handling. |
| **End-to-End & Responsive Smoke** | `Playwright` | Full student flow (`Upload -> Parse Preview -> Target Role -> Results -> PDF Export -> Delete`) verified at `1440×900`, `768×1024`, and `375×812`, plus keyboard tab order checks. |

---

## 2. Synthetic Test Fixture Policy

- **Zero Real Personal Resumes:** Never use real students' personal resumes in tests or Git.
- Generate deterministic synthetic fixtures dynamically in `backend/tests/` (`_make_pdf_bytes`, `_make_docx_bytes`, `_make_scanned_image_pdf_bytes` without committing binary PII blobs):
  1. `fresher_web_dev.pdf` & `.docx` (strong projects, zero corporate experience — must score ≥ 80 without experience penalty)
  2. `data_analyst_tables.docx` (skills & education inside Word tables)
  3. `two_column_designer.pdf` (triggers multi-column layout warning)
  4. `scanned_image_only.pdf` (image-only PDF — must trigger `SCANNED_PDF_DETECTED` `422`)
  5. `empty_0byte.pdf` & `spoofed_exe_as_pdf.pdf` (must reject with `422` / `415`)
  6. `corrupted_archive.docx` (must fail gracefully with `422`)

---

## 3. Verification Truthfulness Rule

Every test pass claimed in `CHANGELOG.md`, PRs, or `markdown/docs/testing/` must record the **exact command run**, **date**, **total passed/failed/skipped**, and **scope** (local vs. production).
