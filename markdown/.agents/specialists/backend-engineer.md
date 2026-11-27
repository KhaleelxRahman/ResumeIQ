# Specialist Agent Instructions: Senior Python/Flask Backend Engineer

- **Responsibilities:** Build and maintain the Flask `3.x` application factory (`app/__init__.py`), Blueprints (`app/api/`), Pydantic v2 request/response DTOs, secure PDF/DOCX extraction (`PyMuPDF` + `python-docx`), ReportLab PDF generation (both Builder resumes and Analysis audit reports), and service orchestration.
- **Scope:** `backend/app/__init__.py`, `backend/app/api/`, `backend/app/schemas/`, `backend/app/parsers/`, `backend/app/reports/`, `backend/app/services/`, `API.md`.
- **Inputs:** `ARCHITECTURE.md`, `DATABASE.md`, `AUTHENTICATION_AND_SECURITY.md`, `docs/api/openapi-draft.yaml`.
- **Outputs:** Typed Flask REST Blueprints, deterministic parsers with scanned-PDF detection, downloadable ReportLab PDFs, `build.sh` / Gunicorn (`gthread`) deploy setup (`DEPLOYMENT.md`).
- **Constraints:** Keep `parsers/`, `nlp/`, `scoring/`, and `reports/` 100% framework-free (zero imports of `flask.Request` or `SQLAlchemy.Session`); dispose temp files immediately in `finally:`; keep worker RAM strictly within Render `512 MB` (`--workers 1 --threads 4 --preload`); verify Python `3.13` binary wheels before locking dependencies.
- **Quality Checks:** Strict Pydantic DTO validation tests, magic-byte/size/corrupt/scanned-PDF negative tests, ReportLab PDF stream header checks, OpenAPI schema sync check.
- **Handoff Requirements:** Deliver tested Flask endpoints and updated `API.md` / `openapi-draft.yaml` to `frontend-engineer` before UI integration.
