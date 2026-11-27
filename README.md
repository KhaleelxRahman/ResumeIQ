# ResumeIQ

A free, student-focused resume builder, ATS analyzer and career readiness platform.

> **Project Status (Phases 0–5 Complete):** Secure PDF/DOCX Upload & Parsing Engine (`backend/` Flask `3.1` + `PyMuPDF` + `python-docx` + Alembic + rate limiting + TTL cleanup; `frontend/` React `18.3` + Vite `8.4` + Tailwind v4 + accessible `ConfirmDialog` + lazy R3F Hero w/ WebGL context-loss fallback). Phases 6–10 (**Builder MVP**, **100-pt Quality Score**, **ATS Engine**, **Role Skill Matching API**, **Feedback**, **Dashboard**, **PDF Reports**) are **NOT IMPLEMENTED** yet and scheduled next.

---

## 1. Product Overview

ResumeIQ helps college students, fresh graduates, and entry-level job seekers understand how automated parsers read their resumes, identify role-specific skill gaps, and improve structure transparently. Aligned with the **SkillOrbit AI Capstone Project** (*Smart Resume Analyzer with AI-Based Feedback*) and expanded into an integrated career workbench, ResumeIQ covers:

- **Resume Upload & Parsing (Implemented — Phase 5):** Secure `.pdf` / `.docx` upload (`<= 5 MB`), magic-byte & OOXML ZIP-bomb protection, `PyMuPDF` multi-column detection, `python-docx` paragraph/table/header extraction, scanned-PDF detection (`422 SCANNED_PDF_DETECTED`), confidence scoring, and an editable parse preview preserving immutable source text.
- **Student Resume Builder (Phase 6 Target):** Guided student onboarding, structured editable sections, live paper preview, **2 ATS-safe templates** (*Swiss Technical Single-Column* & *Academic Editorial Crisp*), reliable ReportLab PDF export, and resume versioning (`v1, v2, ...`). *(DOCX export deferred until core Analyzer, Reports & QA pass.)*
- **Deterministic Resume Quality Score (`0–100`) (Phase 7 Target):** Student-fair rubric evaluating structure & readability, contact info, education, skills, projects, experience/internships, achievements, and completeness—with line-level evidence.
- **ATS Compatibility Estimate (`0–100`) (Phase 7 Target):** Heuristic screening simulation measuring parseability, standard headings, layout warnings, and keyword coverage. *Always labeled as an estimate, never an employer guarantee.*
- **Role-Based & Custom JD Skill Matching (Phase 8 Target):** Curated taxonomies for **Data Analyst**, **Web Developer**, **AI Engineer**, and **Cloud Engineer** plus custom job description keyword extraction, displaying `Matched`, `Synonym`, `Uncertain`, and `Missing` terms with source evidence.
- **Smart Deterministic Feedback & PDF Reports (Phases 9–10 Target):** Rule-based recommendations (zero fabricated claims or metrics), interactive Recharts dashboard, version history, and downloadable ReportLab PDF audit reports.

---

## 2. Honesty, Privacy & Scope Commitments

- **No Deep Learning in Core / Zero Fake AI:** Scoring, ATS estimation, skill matching, and feedback are 100% deterministic (`spaCy`, `NLTK`, rules); Qwen LLMs and paid external inference are excluded from the core product.
- **No Guaranteed Outcomes:** Never guarantees ATS passage, interviews, internships, stipends, or job offers.
- **Privacy-First Resume Handling:** Uploaded binaries are parsed inside ephemeral temporary directories and deleted immediately; server-issued `X-Workspace-Token` sessions (stored only as SHA-256 hashes) isolate workspaces without forced signup; raw resume text is never logged.
- **Free-First Student Access:** Core resume creation, upload, analysis, ATS check, role matching, basic feedback, and PDF export stay free.

---

## 3. Technology Stack

| Layer | Stack | Notes |
|---|---|---|
| **Frontend** | React `18.3`, TypeScript, Vite `8`, Tailwind CSS `v4`, React Router `v7`, Framer Motion, Three.js / R3F, Lucide | 3D Hero Prism lazy-loaded on desktop Landing (`<= 6,000` tris) with automatic static SVG fallback on mobile/reduced-motion. |
| **Backend** | Python Flask `3.1+`, Flask-CORS, Pydantic `v2`, SQLAlchemy `2.1`, Alembic, Gunicorn (`gthread`) | Framework-independent pure domain engines (`app/parsers/`, `app/nlp/`); rate limiting & expired workspace purge built in. |
| **Database** | Neon PostgreSQL (production target), SQLite (local dev & `pytest`) | `pool_pre_ping=True` for Neon 5-minute auto-suspend recovery; SQLite `PRAGMA foreign_keys=ON` across runtime and Alembic. |
| **Parsing & NLP** | `PyMuPDF`, `python-docx`, bounded streaming OOXML ZIP/XXE scanner, deterministic punctuation-safe `skill_matcher` (`spaCy` / `NLTK` / `ReportLab` scheduled across Phases 6–9) | 100% deterministic offline/CPU execution. |
| **Testing** | `pytest`, Flask `test_client()`, `Vitest`, `@testing-library/react`, `Playwright` *(Phases 0–5 Chromium E2E verified; full suite Phase 12)* | Synthetic fixtures only; zero real personal resumes in Git. |

---

## 4. Repository Structure

```text
ResumeIQ/
├── README.md                   # Repository landing guide & quickstart
├── backend/                    # Flask app factory, Alembic migrations, parsers, NLP, pytest suite
├── frontend/                   # React 18.3 + Vite + TypeScript Obsidian UI & Vitest suite
├── docs/                       # OpenAPI draft (docs/api/) and Phase 3 HTML prototypes (docs/design/prototypes/)
└── markdown/                   # Project Markdown (.md) specifications, ADRs, diagrams & agent guides (59 files)
    ├── .agents/                # Multi-agent rules, workflows & 8 specialist guides
    ├── docs/                   # ADRs, Mermaid architecture/ER diagrams, scoring rubric & QA checklists
    └── *.md                    # Product, technical, DB, API, security, QA & deployment specs
```

- **Key Docs:** [PRD.md](markdown/PRD.md) | [TRD.md](markdown/TRD.md) | [ARCHITECTURE.md](markdown/ARCHITECTURE.md) | [DATABASE.md](markdown/DATABASE.md) | [API.md](markdown/API.md) | [AUTHENTICATION_AND_SECURITY.md](markdown/AUTHENTICATION_AND_SECURITY.md) | [PROJECT_IMPLEMENTATION.md](markdown/PROJECT_IMPLEMENTATION.md)
- **Phase 3 Visual Prototypes:** [docs/design/prototypes/index.html](docs/design/prototypes/index.html)

---

## 5. Local Development Setup

### Backend (`backend/`)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate  |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
flask --app run.py seed-db
flask --app run.py purge-expired-workspaces
python run.py
```
Run backend tests:
```bash
pytest -v
```

### Frontend (`frontend/`)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Run frontend tests & production build:
```bash
npm test
npm run build
```
