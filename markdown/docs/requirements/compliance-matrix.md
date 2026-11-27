# Requirements Compliance Matrix & Contradictions Log

Reconciles **SkillOrbit AI Capstone PDF** (Submission Deadline: **28 Dec 2026**) with the **ResumeIQ Master Project Directive** following Phase 2 approvals.

---

## 1. Exact Verification Against SkillOrbit Capstone PDF (Pages 1–8)

| SkillOrbit PDF Section | Exact Assignment Requirement | ResumeIQ Compliance Implementation | Status |
|---|---|---|---|
| **Module 1 (p. 3)** | Upload PDF or DOCX, extract text content, store resume info | `PyMuPDF` + `python-docx` extraction, magic-byte check, SQLAlchemy storage (`workspace_token` isolated) | **Mandatory (Phase 5)** |
| **Module 2 (pp. 3–4)** | Score `/100` across *Structure, Skills, Education, Projects, Contact, Completeness* using rule-based logic | Deterministic 6-rollup / 9-factor student-fair rubric (`markdown/docs/database/scoring-rubric-spec.md`) | **Mandatory (Phase 7)** |
| **Module 3 (p. 4)** | Target job role selection, keyword comparison, missing skills (*Data Analyst, Web Developer, AI Engineer, Cloud Engineer*) | Curated taxonomies for all 4 roles + Custom JD paste mode with `Matched`, `Synonym`, `Uncertain`, `Missing` + proof snippets | **Mandatory (Phase 8)** |
| **Module 4 (pp. 4–5)** | Smart Feedback System (formatting, projects, certifications, internships) | Deterministic priority-ranked rule engine citing evidence and template rewrites (`[metric]` placeholders) | **Mandatory (Phase 9)** |
| **Module 5 (p. 5)** | Interactive Dashboard & Report Generation | Recharts Workspace (`/results/:id`) + History (`/history`) + ReportLab downloadable PDF audit | **Mandatory (Phase 10)** |
| **Tech Stack (pp. 5–6)** | Frontend: HTML/CSS/Tailwind/React (opt.); Backend: **Python Flask**; NLP: **spaCy & NLTK**; DB: SQLite/MySQL; Deploy: Render/Netlify/Vercel | **React 18.3 + Tailwind + Python Flask 3.x + spaCy + NLTK**; SQLite local + Neon PostgreSQL prod (`ADR-001` & `ADR-003`) | **Aligned** |
| **Scope Limits (p. 7)** | **NO** Deep Learning models, LLM training, complex rec engines, enterprise auth, large-scale cloud | 100% deterministic core; Qwen LLMs excluded; HF embeddings off (`ENABLE_HF_EMBEDDINGS=false`); anonymous `workspace_token` | **Strictly Enforced** |
| **Deliverables (p. 7)** | Complete source code, Project documentation, PPT, Project report, GitHub link, Deployment link, Demo video | Explicitly scheduled into **Phase 14 (Days 30–32)** ahead of **28 Dec 2026** | **Scheduled** |

---

## 2. Master Directive Additions & Phased Boundaries

| Directive Feature | Classification | Target Phase | Constraint |
|---|---|---|---|
| **Module A — Student Resume Builder** | **Approved Core MVP** | Phase 6 | Start with **2 ATS-safe templates** (*Swiss Technical*, *Academic Editorial*), reliable **PDF export**, editable sections, versioning. |
| **Module A — Builder DOCX Export** | **Deferred** | Post-Core QA | Revisit only after Analyzer, Reports, and Phase 12 QA pass (`ENABLE_DOCX_BUILDER_EXPORT=false`). |
| **Optional CPU Embedding Benchmark** | **Disabled Experiment** | Phase 9 (Optional) | Only local `all-MiniLM-L6-v2` / `bge-small-en-v1.5` benchmark if permitted without altering deterministic scores. |
| **Qwen LLMs / Paid External Inference** | **Excluded / Rejected** | Never in core | Explicitly removed from required product scope (`ADR-002`). |
