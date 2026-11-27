# API.md — Flask REST API Specification & Pydantic Contracts

**Base Path:** `/api`  
**Framework:** Python Flask `3.x` Blueprints + Pydantic v2 DTO validation  
**Contract Source of Truth:** [openapi-draft.yaml](../docs/api/openapi-draft.yaml)

---

## 1. Server-Issued Workspace Token Security

- **Session Issuance:** `POST /api/workspaces/session` generates a server-side cryptographic token (`secrets.token_urlsafe(32)`), persists its SHA-256 `token_hash` in `workspaces`, and returns `{ workspace_id, token, expires_at }`.
- **Ownership Enforcement:** Every private endpoint validates `X-Workspace-Token` against active, non-expired `workspaces.token_hash` rows and enforces `resource.workspace_id == workspace.id`. Arbitrary unissued tokens are rejected (`401 WORKSPACE_TOKEN_INVALID`).
- **Workspace Purge:** `DELETE /api/workspaces/current` permanently deletes the workspace and cascades all owned resumes, versions, job descriptions, analyses, and recommendations.

---

## 2. Standard Error Envelope

Every `4xx` / `5xx` Flask error handler returns:
```json
{
  "error": {
    "code": "WORKSPACE_TOKEN_INVALID",
    "message": "Workspace session token is missing, invalid, or expired.",
    "details": {}
  }
}
```
- `400` Bad Request / Pydantic validation failure
- `401` Missing, invalid, or expired `X-Workspace-Token`
- `403` Attempted mutation of read-only sample resources
- `404` Resource not found or owned by a different workspace
- `413` Upload exceeds `5 MB`
- `415` Spoofed extension failing binary magic-byte check or invalid OOXML structure
- `422` Empty, corrupted, password-protected, ZIP-bomb/XXE, or scanned/outlined-vector PDF document
- `429` Rate limit exceeded (`RATE_LIMIT_EXCEEDED` w/ `Retry-After`) or workspace resume quota reached (`WORKSPACE_QUOTA_EXCEEDED`)
- `500` Sanitized internal error (zero stack traces or PII)

---

## 3. Endpoint Inventory

### Health, Sessions & Demo Samples *(Implemented — Phase 4)*
| Method & Path | Auth Scope | Purpose | Status |
|---|---|---|---|
| `GET /api/health` | Public | Readiness check: `{ status, db, nlp_ready, hf_mode, version, engine_version }`. | **IMPLEMENTED** |
| `POST /api/workspaces/session` | Public *(rate-limited)* | Prunes expired sessions cleanly & generates server-issued workspace token (`201 Created`). | **IMPLEMENTED** |
| `GET /api/workspaces/current` | Valid `X-Workspace-Token` | Validates current session metadata & expiration (`200 OK`). | **IMPLEMENTED** |
| `DELETE /api/workspaces/current` | Valid `X-Workspace-Token` *(rate-limited)* | Permanently purges workspace + all cascaded data (`204 No Content`). | **IMPLEMENTED** |
| `GET /api/samples` | Public | Lists synthetic read-only demo resumes (`is_sample=true`). | **IMPLEMENTED** |
| `GET /api/samples/:sampleId` | Public | Returns read-only sample sections, detected canonical `skills`, `contact_flags`, and `masked_contact`. | **IMPLEMENTED** |

### Resume Upload, Parsing & Builder *(Phase 5–6)*
| Method & Path | Purpose | Status |
|---|---|---|
| `POST /api/resumes/upload` | Rate/quota checked; validate `<= 5 MB` file (+ multipart overhead headroom), binary sniffing & bounded OOXML ZIP-bomb/XXE scan, parse via temp dir (`finally:` deleted), persist extracted metadata. | **IMPLEMENTED (Phase 5)** |
| `PATCH /api/resumes/:id/versions/:versionId` | Update reviewed parsed sections while preserving immutable `raw_text`; forbids client `structured_payload` overrides (`extra="forbid"`) and recomputes `skills`, `word_count`, and contact flags on server. | **IMPLEMENTED (Phase 5)** |
| `GET /api/resumes` | List workspace resumes (`?include_samples=true`). | **IMPLEMENTED (Phase 5)** |
| `GET /api/resumes/:id` | Get resume details, extracted skills, masked contact, and sections (`404` across workspaces). | **IMPLEMENTED (Phase 5)** |
| `DELETE /api/resumes/:id` | Cascade-delete owned resume + versions + analyses (`403` on samples). | **IMPLEMENTED (Phase 5)** |
| `POST /api/resumes/builder` | Persist structured resume (`swiss-technical` or `academic-editorial`) as `v1`. | **FRONTEND INTEGRATED (Phase 6)** |
| `POST /api/resumes/:id/versions` | Save revised resume snapshot (`vN`). | **FRONTEND INTEGRATED (Phase 6)** |
| `GET /api/resumes/:id/versions/:versionId/export?format=pdf` | Stream PDF resume export. *(DOCX deferred.)* | **FRONTEND INTEGRATED (Phase 6)** |

### Roles, Analysis, Feedback & Reports *(Phase 4, 7–10)*
| Method & Path | Purpose | Status |
|---|---|---|
| `GET /api/job-roles` | List the 4 mandatory SkillOrbit roles with skill counts & metadata. | **IMPLEMENTED (Phase 4)** |
| `GET /api/job-roles/:slug` | Full curated `mandatory` & `preferred` taxonomy for a role. | **IMPLEMENTED (Phase 4)** |
| `POST /api/job-descriptions/extract` | Deterministic extraction preview for pasted custom JD. | **PLANNED (Phase 8)** |
| `POST /api/analyses` | Execute deterministic Quality (`0–100`), ATS Estimate (`0–100`), Skill Gap & Smart Feedback (`201`). | **PLANNED (Phase 7–8)** |
| `GET /api/analyses/:id` | Fetch complete analysis breakdown + evidence snippets. | **PLANNED (Phase 7–10)** |
| `GET /api/analyses/:id/feedback` | Filtered recommendations (`?priority=high`). | **PLANNED (Phase 9)** |
| `GET /api/analyses/:id/report` | Export ReportLab PDF audit report. | **PLANNED (Phase 10)** |
| `DELETE /api/analyses/:id` | Delete specific analysis snapshot. | **PLANNED (Phase 10)** |
| `GET /api/history` | Paginated workspace analysis runs (`?limit=20&offset=0`). | **PLANNED (Phase 10)** |
