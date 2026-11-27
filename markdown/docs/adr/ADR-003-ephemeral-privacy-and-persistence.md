# ADR-003: Server-Issued Workspace Privacy & Production DB Persistence

- **Status:** Accepted & Updated (Phase 4 Security Hardening)
- **Date:** 2026-11-26
- **Context:**
  - ResumeIQ stores parsed resume text and analysis history in a student-accessible web app without enterprise login/OAuth barriers.
  - Accepting arbitrary client-invented `X-Workspace-Token` strings creates spoofing/enumeration risk.
  - Meanwhile, SQLite on Render's ephemeral disk loses all data upon restarts/redeploys.
- **Decision:**
  1. **Server-Issued Cryptographic Workspace Sessions:** `POST /api/workspaces/session` generates a 256-bit `secrets.token_urlsafe(32)` token on the server, stores only its SHA-256 `token_hash` in the `workspaces` table, and enforces active token + `workspace_id` ownership verification on every private API endpoint.
  2. **Synthetic Samples:** Pre-seeded read-only demo resumes (`is_sample=True`) let evaluators test immediately without creating real PII records.
  3. **Neon PostgreSQL + Local SQLite:** SQLAlchemy 2.0 + Alembic migrations (`native_enum=False`, `render_as_batch=True`) power SQLite locally and Neon PostgreSQL in production (`pool_pre_ping=True`).
  4. **Zero Permanent Binary Storage:** Uploaded files live strictly inside an exception-safe temp context manager (`ephemeral_upload_path`) and are wiped immediately on success, validation error, or exception.
- **Consequences:** Strong multi-tenant privacy isolation without enterprise login friction, cross-dialect migration reliability, and resilient cloud persistence.
