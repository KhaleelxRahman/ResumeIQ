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
- Browser generates a 128-bit UUIDv4 token stored in `localStorage` and sent via `X-Workspace-Token`.
- Every workspace query and cascade delete enforces `WHERE workspace_token = :token`.
- Pre-seeded **Synthetic Demo Samples** (`is_sample = True`) allow evaluators to test in 1 click without touching any real user's data.

---

## 3. Ephemeral Upload Lifecycle

1. Client uploads PDF/DOCX (`<= 5 MB`) to `POST /api/resumes/upload`.
2. Flask validates size and binary magic bytes (`%PDF-` or valid OOXML ZIP containing `word/document.xml`).
3. File writes momentarily to a `tempfile.TemporaryDirectory()` under a `uuid4` filename.
4. `PyMuPDF` or `python-docx` extracts structured sections, contact flags, and layout warnings.
5. `finally:` block **deletes the temp file immediately** before returning `201 Created`.
6. Only extracted text and normalized metadata persist to Neon PostgreSQL (or local SQLite).
