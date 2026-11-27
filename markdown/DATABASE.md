# DATABASE.md — Relational Schema & Transparent Scoring Specification

---

## 1. Database Engine Strategy (Neon PostgreSQL + Local SQLite)

- **Production Candidate:** **Neon PostgreSQL** (`DATABASE_URL=postgresql+psycopg://...`) managed with **SQLAlchemy 2.0** and **Alembic** migrations.
  - **Verified Neon Free-Tier Profile (Nov 2026 — re-verify prior to Phase 13 deploy):** `$0/mo`, `1 GB` Postgres storage per project, `100 CU-hours/mo`, autoscaling up to `2 CU`, **auto-suspend after 5 minutes of inactivity**, `5 GB` egress/project.
  - **Connection Resilience:** Configure SQLAlchemy `create_engine(..., pool_pre_ping=True, pool_recycle=240)`.
- **Local Development & Isolated Tests:** **SQLite** (`sqlite:///./resumeiq_dev.db` or `:memory:` for `pytest`).
- **Cross-Dialect Migration Discipline:** Alembic uses `render_as_batch=True` and portable types (`Uuid(as_uuid=True)`, `JSON`, `DateTime(timezone=True)`, `Enum(..., native_enum=False, create_constraint=True)`) so every migration runs identically across SQLite and Neon PostgreSQL.

*(See [docs/database/er-diagram.md](docs/database/er-diagram.md) for the Mermaid ER diagram.)*

---

## 2. Core Entities & Relationships (`10` Tables)

### 1. `workspaces` *(Server-Issued Session Isolation)*
- `id` (`UUID`, PK)
- `token_hash` (`String(64)`, UNIQUE, NOT NULL, indexed — SHA-256 hex digest of server-generated `secrets.token_urlsafe(32)`)
- `created_at` (`DateTime(timezone=True)`, NOT NULL)
- `last_seen_at` (`DateTime(timezone=True)`, NOT NULL)
- `expires_at` (`DateTime(timezone=True)`, NOT NULL)

### 2. `resumes`
- `id` (`UUID`, PK)
- `workspace_id` (`UUID`, FK → `workspaces.id`, `ON DELETE CASCADE`, nullable ONLY when `is_sample=True`, indexed)
- `source_type` (`Enum(native_enum=False): upload_pdf | upload_docx | builder | sample`, NOT NULL)
- `is_sample` (`Boolean`, default `False`, indexed)
- `title` (`String(160)`, NOT NULL)
- `active_version_id` (`UUID`, nullable — references latest active version)
- `created_at`, `updated_at` (`DateTime(timezone=True)`)

### 3. `resume_versions`
- `id` (`UUID`, PK)
- `resume_id` (`UUID`, FK → `resumes.id`, `ON DELETE CASCADE`)
- `version_number` (`Integer`, NOT NULL)
- `file_name` (`String(255)`, nullable — sanitized display basename only)
- `file_size_bytes` (`Integer`, nullable)
- `template_slug` (`String(64)`, default `'swiss-technical'`)
- `candidate_label` (`String(120)`, nullable)
- `contact_flags_json` (`JSON`)
- `masked_contact_json` (`JSON`)
- `structured_payload_json` (`JSON`)
- `raw_text` (`Text`, NOT NULL)
- `word_count` (`Integer`, NOT NULL)
- `extraction_confidence` (`Float`, `0.0–1.0`)
- `parse_warnings_json` (`JSON`)
- `created_at` (`DateTime(timezone=True)`)

### 4. `resume_sections`
- `id` (`UUID`, PK)
- `resume_version_id` (`UUID`, FK → `resume_versions.id`, `ON DELETE CASCADE`)
- `section_type` (`String(48)`)
- `raw_heading` (`String(120)`)
- `content_text` (`Text`, NOT NULL)
- `confidence` (`Float`, default `1.0`)
- `order_index` (`Integer`, NOT NULL)

### 5. `job_roles`
- `id` (`UUID`, PK)
- `slug` (`String(64)`, UNIQUE, NOT NULL — `data-analyst`, `web-developer`, `ai-engineer`, `cloud-engineer`)
- `title` (`String(120)`, NOT NULL)
- `category` (`String(64)`)
- `is_core_mandatory` (`Boolean`, default `True`)
- `description` (`Text`)

### 6. `role_skills`
- `id` (`UUID`, PK)
- `job_role_id` (`UUID`, FK → `job_roles.id`, `ON DELETE CASCADE`)
- `skill_name` (`String(100)`, NOT NULL)
- `canonical_key` (`String(100)`, NOT NULL, indexed)
- `category` (`String(64)`)
- `requirement_level` (`Enum(native_enum=False): mandatory | preferred`)
- `weight` (`Float`, default `1.0`)
- `learning_priority` (`Integer`, `1–5`)

### 7. `job_descriptions`
- `id` (`UUID`, PK)
- `workspace_id` (`UUID`, FK → `workspaces.id`, `ON DELETE CASCADE`, NOT NULL, indexed)
- `title` (`String(160)`, NOT NULL)
- `raw_text` (`Text`, NOT NULL)
- `extracted_requirements_json` (`JSON`)
- `created_at` (`DateTime(timezone=True)`)

### 8. `analyses`
- `id` (`UUID`, PK)
- `workspace_id` (`UUID`, FK → `workspaces.id`, `ON DELETE CASCADE`, NOT NULL, indexed)
- `resume_version_id` (`UUID`, FK → `resume_versions.id`, `ON DELETE CASCADE`)
- `job_role_id` (`UUID`, FK → `job_roles.id`, nullable)
- `job_description_id` (`UUID`, FK → `job_descriptions.id`, `ON DELETE SET NULL`, nullable)
- `experience_track` (`Enum(native_enum=False): student_fresher | junior | mid`, NOT NULL)
- `quality_score` (`Integer`, `0–100`)
- `ats_estimate` (`Integer`, `0–100`)
- `skill_match_pct` (`Float`, `0.0–100.0`)
- `quality_breakdown_json` (`JSON`)
- `ats_breakdown_json` (`JSON`)
- `engine_version` (`String(32)`, NOT NULL)
- `created_at` (`DateTime(timezone=True)`)

### 9. `analysis_skill_matches`
- `id` (`UUID`, PK)
- `analysis_id` (`UUID`, FK → `analyses.id`, `ON DELETE CASCADE`)
- `skill_name` (`String(100)`, NOT NULL)
- `category` (`String(64)`)
- `requirement_level` (`Enum(native_enum=False): mandatory | preferred`)
- `match_status` (`Enum(native_enum=False): matched | synonym_matched | uncertain | missing`, NOT NULL)
- `evidence_section` (`String(48)`, nullable)
- `evidence_snippet` (`String(320)`, nullable)
- `learning_priority` (`Integer`, nullable)

### 10. `recommendations`
- `id` (`UUID`, PK)
- `analysis_id` (`UUID`, FK → `analyses.id`, `ON DELETE CASCADE`)
- `priority` (`Enum(native_enum=False): high | medium | low`, NOT NULL)
- `category` (`String(64)`)
- `issue` (`String(220)`, NOT NULL)
- `evidence` (`Text`, NOT NULL)
- `why_it_matters` (`Text`, NOT NULL)
- `suggested_improvement` (`Text`, NOT NULL)
- `example_rewrite` (`Text`, nullable)

---

## 3. Indexes & Deletion Cascades

- Composite indexes: `ix_resumes_workspace_created` (`workspace_id, created_at`), `ix_analyses_workspace_created` (`workspace_id, created_at`), `ix_skill_matches_analysis_status` (`analysis_id, match_status`).
- Deleting a `workspace` or `resume` deletes all descendant versions, sections, job descriptions, analyses, skill matches, and recommendations via `ON DELETE CASCADE`.

---

## 4. Documented 100-Point Resume Quality Rubric Summary

*(Full formulas and ATS Estimate equation in [scoring-rubric-spec.md](docs/database/scoring-rubric-spec.md).)*

| Parameter (SkillOrbit Mod 2) | Weight | Criteria Summary |
|---|---|---|
| **1. Resume Structure & Readability** | **20** | ATS headings (`6`), ordering (`3`), parse/column hygiene (`3`), bullet & action-verb clarity (`8`). |
| **2. Skills Section** | **20** | Dedicated skills block (`6`), grouped categories (`2`), calibrated canonical breadth `6–30` (`12`; stuffing guard). |
| **3. Education Details** | **15** | Degree/program (`6`), institution (`4`), graduation/dates (`3`), GPA/coursework (`2`). |
| **4. Projects Section** | **15** | `>= 2` project entries (`6`), technical stack attribution (`5`), engineering scope & outcome phrasing (`4`). |
| **5. Contact Information** | **10** | Email (`3`), phone (`2`), GitHub/LinkedIn/Portfolio links (`3`), candidate header block (`2`). |
| **6. Completeness, Experience & Achievements** | **20** | `student_fresher`: Internships (`6` pts — auto-substituted via project depth/hackathons if zero formal internships), Achievements & Certifications (`6`), Summary & Word Budget `300–900` (`8`). `junior/mid`: Experience (`10`), Achievements & Certs (`4`), Summary & Word Budget (`6`). |
| **Total** | **100** | **100% deterministic; zero LLM score generation.** |
