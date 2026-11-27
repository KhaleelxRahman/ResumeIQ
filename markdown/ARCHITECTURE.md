# ARCHITECTURE.md — System Architecture & Component Design

---

## 1. High-Level Topology

ResumeIQ uses a **Modular Monolith Flask Backend + React SPA Frontend**—balancing 100% SkillOrbit alignment (`Python Flask`), strict framework-agnostic engine separation, and single-service deployment affordability.

```text
[ Browser (React 18.3 + Vite + R3F Hero) ]
        │  HTTPS + JSON / Multipart + X-Workspace-Token
        ▼
[ Flask Blueprint Layer (app/api/ + Pydantic v2 DTOs) ]
        │
        ├──► [ Services Layer (upload, builder, analysis, report, retention) ]
        │          │
        │          └──► [ Pure Domain Engines (parsers/, nlp/, scoring/, reports/) ]
        │                   ├── Document Extractor (PyMuPDF + python-docx)
        │                   ├── Sectioner & Entity Extractor (spaCy + Regex)
        │                   ├── Skill & JD Matcher (Canonical Taxonomy + NLTK/TF-IDF)
        │                   ├── Quality & ATS Engines (Deterministic Rubrics)
        │                   └── ReportLab PDF Builder (Resumes + Analysis Audits)
        │
        └──► [ Persistence Layer (SQLAlchemy 2.0 + Alembic, pool_pre_ping=True) ]
                   └── Neon PostgreSQL (Production) / SQLite (Local Dev & pytest)
```

*(See [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md) for Mermaid component and sequence diagrams.)*

---

## 2. Core Architectural Principles

### 1. Framework-Independent Domain Engines
All parsing, NLP segmentation, skill matching, quality scoring, ATS estimation, feedback rules, and ReportLab PDF generation live in pure Python modules accepting typed dataclasses/Pydantic models and returning deterministic objects. They never import `flask.Request` or `SQLAlchemy.Session`, keeping unit testing instant and making the HTTP adapter trivially swappable (`ADR-001`).

### 2. Consolidated 6-Route Frontend Workspace
- `/` — Landing Page (Editorial identity, lazy-loaded 3D Hero Prism + static SVG fallback).
- `/builder` — Guided Student Resume Builder (**2 premium ATS-safe templates**, editable sections, live paper preview, version bar, ReportLab PDF export, 1-click "Analyze Built Resume").
- `/analyze` — Analysis Studio (Upload PDF/DOCX OR select Built/Sample resume → Editable Parse Preview → Role / Experience Track / Custom JD selector).
- `/results/:analysisId` — Deep-Dive Analysis Workspace (KPI gauges, Quality 100-pt Audit, ATS Estimate, Skill Gap Matrix + Evidence Inspector, Smart Feedback, PDF Report export via `?tab=`).
- `/history` — Version & Analysis History (Score delta progression across v1/v2/v3, privacy delete controls).
- `/about` — Methodology & Transparency (Scoring weights, ATS disclaimer, SkillOrbit compliance).

### 3. Canonical Unified Document Model
Both **Module A (Resume Builder)** and **Module B (PDF/DOCX Upload)** normalize into one internal `StructuredResumeDocument` payload, allowing students to iterate in the Builder and immediately run full analysis without re-exporting and re-uploading files.

### 4. Anonymous Privacy Scoping (`X-Workspace-Token`)
- Browser never invents or self-signs workspace tokens (`ADR-003`). Instead, the client calls `POST /api/workspaces/session`, and Flask issues a 256-bit CSPRNG opaque token (`secrets.token_urlsafe(32)`), persists **only its SHA-256 `token_hash`** in `workspaces` (`WORKSPACE_TTL_DAYS=30`), and returns the raw token once to `localStorage`.
- Every private query (`resumes`, `resume_versions`, `job_descriptions`, `analyses`) validates the active non-expired token hash and enforces strict `resource.workspace_id == active_workspace.id` ownership (`404` on foreign access; `403` on sample mutation).
- Pre-seeded **Synthetic Demo Samples** (`is_sample = True`) allow evaluators to test in 1 click without touching any real user's data.
- Expired workspaces are pruned opportunistically on session creation and via `flask --app run.py purge-expired-workspaces`, cascade-deleting all child data.

*(Note: Core backend modules currently implemented cover Phases 4–5: `app/api/`, `app/services/`, `app/models/`, `app/parsers/`, and standalone `app/nlp/skill_matcher.py`. `app/scoring/`, `app/reports/`, `spaCy`, and `ReportLab` arrive in Phases 6–10.)*

---

## 3. Ephemeral Upload Lifecycle

1. Client uploads PDF/DOCX (`<= 5 MB`) to `POST /api/resumes/upload`.
2. Flask validates size and binary magic bytes (`%PDF-` or valid OOXML ZIP containing `word/document.xml`).
3. File writes momentarily to a `tempfile.TemporaryDirectory()` under a `uuid4` filename.
4. `PyMuPDF` or `python-docx` extracts structured sections, contact flags, and layout warnings.
5. `finally:` block **deletes the temp file immediately** before returning `201 Created`.
6. Only extracted text and normalized metadata persist to Neon PostgreSQL (or local SQLite).
