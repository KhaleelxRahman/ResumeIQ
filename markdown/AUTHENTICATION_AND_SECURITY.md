# AUTHENTICATION_AND_SECURITY.md — Security, Privacy, Retention & Deletion Policy

---

## 1. Security & Privacy Posture

Resumes contain sensitive Personal Identifiable Information (PII): legal names, emails, phone numbers, academic history, and career records. Even without full enterprise user accounts, ResumeIQ enforces strict server-validated session isolation, ephemeral binary handling, PII-safe logging, and deterministic ownership validation.

---

## 2. Server-Issued Workspace Sessions (Not Arbitrary Client Tokens)

- **Zero Fake Auth Wall:** Core student tools remain free and immediately accessible without forced signup or password friction, respecting SkillOrbit's scope limits.
- **Server-Generated Cryptographic Tokens:**
  - Client **never** invents its own trusted `X-Workspace-Token`.
  - When a new browser starts a session, it calls `POST /api/workspaces/session`.
  - The Flask server generates a 256-bit cryptographically random opaque token (`secrets.token_urlsafe(32)`), persists **only its SHA-256 hex digest (`token_hash`)** in the `workspaces` table with an expiration timestamp (`WORKSPACE_TTL_DAYS=30`), and returns the raw token once to the client.
  - Every private API endpoint (`resumes`, `builder`, `analyses`, `reports`, `history`) hashes the incoming `X-Workspace-Token` header, verifies an active, non-expired `Workspace` row exists (`401 WORKSPACE_TOKEN_REQUIRED` / `401 WORKSPACE_TOKEN_INVALID`), updates `last_seen_at`, and verifies `resource.workspace_id == active_workspace.id` (`404` on ownership mismatch to avoid existence leaks).
  - Pre-seeded **Synthetic Demo Samples** (`is_sample = True`) are strictly read-only (`403` on mutation/delete attempts).

---

## 3. Data Privacy, Retention & Deletion Policy

| Data Category | Storage Location | Retention Period | Deletion Mechanism |
|---|---|---|---|
| **Original Uploaded Binaries (`.pdf`, `.docx`)** | Ephemeral `tempfile.TemporaryDirectory()` only (never DB, never public/Git dirs) | **0 seconds post-parse** | Deleted immediately inside `ephemeral_upload_path()` `finally:` block on success, parse error, and unhandled exceptions. |
| **Extracted Resume Text, Sections & Version JSON** | `resumes`, `resume_versions`, `resume_sections` (scoped to `workspace_id`) | Up to `WORKSPACE_TTL_DAYS` (`30` days default) | Immediate cascade purge via `DELETE /api/resumes/:id` or `DELETE /api/workspaces/current`. |
| **Custom Job Descriptions** | `job_descriptions` (`workspace_id` scoped) | Up to `WORKSPACE_TTL_DAYS` | Deleted via workspace purge (`ON DELETE CASCADE`). |
| **Analyses, Skill Matches & Recommendations** | `analyses`, `analysis_skill_matches`, `recommendations` | Tied to parent `resume` / `workspace` | Cascaded automatically when parent analysis, resume, or workspace is deleted (`ON DELETE CASCADE`). |
| **Application & Access Logs** | Server stdout / stderr | Operational log retention | **Zero PII:** Logs record `request_id`, `method`, `path`, `status_code`, `duration_ms`—never raw resume text, emails, phones, names, or workspace tokens. |

---

## 4. File Upload Security Pipeline

| Control | Implementation Rule |
|---|---|
| **Size Limit** | Enforce `MAX_UPLOAD_BYTES = 5 * 1024 * 1024` (5 MB) via Flask `MAX_CONTENT_LENGTH` and streaming byte check (`413 Content Too Large`). |
| **Extension & MIME Check** | Accept only `.pdf` (`application/pdf`) and `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). |
| **Magic-Byte Inspection** | Verify `%PDF-` header bytes for PDF; verify `PK\x03\x04` ZIP archive signature containing `word/document.xml` for DOCX (`415 Unsupported Media Type` on mismatch). |
| **ZIP Bomb Mitigation** | When inspecting DOCX archives, verify total uncompressed archive size `< 25 MB` before XML parsing. |
| **Path Traversal Protection** | Never construct disk paths from uploaded filenames (`secure_filename` used strictly for sanitized display metadata; disk writes always use `uuid4()` inside `TemporaryDirectory`). |

---

## 5. API & Infrastructure Hardening

- **SQL Injection Protection:** SQLAlchemy 2.0 parameterized ORM queries exclusively.
- **CORS Restrictions:** Strict `CORS_ORIGINS` allowlist (`X-Workspace-Token`, `Content-Type` allowed; `Content-Disposition` exposed).
- **Safe Error Responses:** No stack traces, SQL strings, or filesystem paths leaked in HTTP responses.
- **Secrets Hygiene:** `.env` ignored in `.gitignore`; `.env.example` holds keys/defaults only.
