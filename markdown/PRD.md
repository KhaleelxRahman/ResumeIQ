# PRD.md — Product Requirements Document

**Product:** ResumeIQ — Smart Resume Builder, ATS Analyzer & Student Career Intelligence Platform  
**Authoritative Inputs:** SkillOrbit AI Capstone PDF (*Smart Resume Analyzer with AI-Based Feedback*, deadline **28 December 2026**) + Master Project Directive  
**Status:** Phase 2 Signed-Off Baseline

---

## 1. Problem Statement

College students, fresh graduates, and entry-level technical applicants regularly get filtered out before human review because they lack clear visibility into:
1. How automated parsers (ATS) extract multi-column layouts, tables, and headings from PDF/DOCX files.
2. Which role-specific technical keywords are missing or under-evidenced for target entry-level roles.
3. How to strengthen project and internship bullets cleanly without inventing fake achievements or metrics.
4. Why black-box scores fail to explain *what* to fix or *why*.

---

## 2. Target User Personas

| Persona | Profile | Primary Needs |
|---|---|---|
| **Aarav — Final-Year CS/IT Student** | 2 academic projects, 0–1 internships, targeting *Web Developer* or *AI Engineer* | Clean ATS-safe resume templates, student-fair scoring without full-time work penalty, evidence-backed bullet guidance. |
| **Diya — Graduate Career Switcher** | Engineering/science graduate pivoting to *Data Analyst* or *Cloud Engineer* | Upload existing PDF/DOCX, check missing SQL/ETL/Cloud skills, compare against custom job descriptions. |
| **SkillOrbit Capstone Reviewer / Mentor** | Evaluating live deployment and source code | 1-click synthetic demo resumes, fast unblocked access without signup walls, deterministic rubric transparency, crisp PDF audit reports. |

---

## 3. Scope Classification (Final Phase 2 Lock)

### A. Mandatory Core Product Scope
1. **Module B — Resume Upload & Parsing (`SkillOrbit Mod 1`):** PDF/DOCX upload (`<= 5 MB`), magic-byte validation, text/section/contact/education/skills/projects/experience extraction, scanned PDF detection (`422 SCANNED_PDF_DETECTED`), extraction confidence flags, editable parse preview.
2. **Module C — Deterministic Resume Quality Score (`SkillOrbit Mod 2`):** Transparent `0–100` score across Structure & Readability, Skills, Education, Projects, Contact Info, and Completeness/Experience/Achievements with student-fair fresher weighting and line-level evidence.
3. **Module D — ATS Compatibility Estimate (`SkillOrbit Mod 3`):** Heuristic screening simulation evaluating section standardness, readability, formatting warnings, keyword density, and custom JD coverage—explicitly labeled as an estimate.
4. **Module E — Role-Based Skill Matching (`SkillOrbit Mod 3`):** Curated skill taxonomies for the **4 mandatory SkillOrbit roles** (*Data Analyst, Web Developer, AI Engineer, Cloud Engineer*) + **Custom Job Description** matching, showing `Matched`, `Missing`, `Synonym`, and `Uncertain` skills with proof snippets.
5. **Module F — Smart Deterministic Feedback (`SkillOrbit Mod 4`):** Priority-ranked (`High/Medium/Low`) rule-based recommendations containing Issue, Evidence, Why It Matters, Suggested Improvement, and template-based rewrite examples (`[metric]` placeholders—zero fabricated achievements).
6. **Module G — Dashboard & Version Tracking (`SkillOrbit Mod 5`):** Interactive dashboard showing Quality Score, ATS Estimate, Skill Match %, completion indicator, skill gaps, version comparison (`v1 → v2`), and recent workspace history.
7. **Module H — PDF Report Export (`SkillOrbit Mod 5`):** Downloadable ReportLab PDF analysis report matching live metrics, gaps, warnings, and action plan.
8. **Module A — Student Resume Builder (Focused MVP):** Guided student onboarding, editable structured sections (Personal, Summary, Education, Skills, Projects, Internships, Work Experience, Certifications, Achievements, Languages), live paper preview, **2 premium ATS-safe templates** (*Swiss Technical Single-Column*, *Academic Editorial Crisp*), reliable **PDF export**, **version management**, and direct 1-click handoff to Analyzer.

### B. Explicitly Deferred Until Core QA Passes
- **Builder DOCX Export:** Deferred until Analyzer, Reports, and core Builder PDF pass Phase 12 QA (`ENABLE_DOCX_BUILDER_EXPORT=false`).
- **Additional Optional Job Roles** beyond the 4 mandatory SkillOrbit roles.
- **Optional Local Embedding Benchmark** (`all-MiniLM-L6-v2` / `bge-small-en-v1.5`, `ENABLE_HF_EMBEDDINGS=false`) — strictly experimental/offline only if permitted without violating SkillOrbit's no-deep-learning rule.

### C. Explicitly Out of Scope / Rejected
- **Deep Learning models inside required scoring/matching**, **LLM training**, **Qwen LLM integration**, or **paid external inference providers**.
- **Server-side OCR (`tesseract`/`poppler`)** in v1.
- **Enterprise Auth / RBAC / Payments / Microservices**.
- **Guarantees of ATS passage, interviews, internships, stipends, or job placement.**

---

## 4. Non-Functional Requirements

- **Transparency:** Scoring formulas documented in [scoring-rubric-spec.md](docs/database/scoring-rubric-spec.md) and visible via `/about`.
- **Privacy:** Ephemeral temp file deletion, `X-Workspace-Token` browser isolation, zero PII logging.
- **Accessibility & Performance:** WCAG 2.1 AA compliance ([ACCESSIBILITY.md](ACCESSIBILITY.md)), core bundle `<= 180 KB` gzipped, backend RSS `< 350 MB` (`PERFORMANCE.md`).
