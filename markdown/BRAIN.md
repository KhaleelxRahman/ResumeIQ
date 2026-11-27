# BRAIN.md — Persistent Engineering Memory & Technical Context

> Living repository context maintained across phases. Records verified environment facts, finalized decisions, and execution ledger.

---

## 1. Verified Environment & Hosting Limits (Audited 2026-11-26)

| Component | Verified Fact | Engineering Implication |
|---|---|---|
| **Workspace Path** | `C:\Users\KhaleelLocal\.gemini\antigravity\scratch\resumeiq` | Backend (`backend/`) and Frontend (`frontend/`) Phase 4 foundations built and verified locally. |
| **Local Toolchain** | `Python 3.13.17`, `Node v26.13.1`, `npm 11.20.0`, `Git 2.56.1` | Core Flask 3.1.3 / SQLAlchemy 2.1.9 / Pydantic 2.14.4 / Alembic 1.20.1 / psycopg-binary 3.3.9 wheels verified on Python 3.13.17. |
| **Installed Plugins / MCP** | `agentic-bundle-essentials`, `chrome-devtools-plugin`, unauthenticated `coderabbit`, `netlify`, `sentry`, `supabase` | Zero GitHub/HF/Vercel/Render MCP servers assumed. |
| **Neon Free Tier (Verified Nov 2026)** | `1 GB` Postgres storage/project, `100 CU-hrs/mo`, autoscaling to `2 CU`, **auto-suspend after 5 min inactivity**, `5 GB` egress | Configured SQLAlchemy `pool_pre_ping=True` + `pool_recycle=240`; re-verify limits before Phase 13 deploy. |
| **Render Free Tier (Verified Nov 2026)** | `512 MB` RAM, `~0.1` vCPU, `750` hrs/mo, **15-min spin-down (~50–60s cold start)** | Use `gunicorn --workers 1 --threads 4 --worker-class gthread --preload`. |

---

## 2. Finalized Safeguards & Phase 4 Decisions

1. **Server-Issued Workspace Sessions:** `POST /api/workspaces/session` generates `secrets.token_urlsafe(32)`, stores only SHA-256 `token_hash` in `workspaces`, and enforces token + ownership checks on private endpoints (`assert_workspace_ownership`).
2. **Backend (`ADR-001`):** Python Flask `3.1.3` + Pydantic v2 + SQLAlchemy + Alembic (`96cd3747957a` verified across SQLite and compiled against PostgreSQL DDL).
3. **Deterministic Core (`ADR-002`):** Pure Python `skill_matcher.py` handles punctuation-sensitive tokens (`C`, `C++`, `C#`, `R`, `Go`, `JavaScript`) and `ephemeral_upload_path()` guarantees temp cleanup on success/error/exception.
4. **Frontend Shell (`ADR-004`):** React `18.3` + Vite `6.4.6` + TypeScript (`strict: true`) + Tailwind CSS v4 + lazy R3F hero (`65.45 kB` gzipped core JS shell + lazy `220.80 kB` gzipped `vendor-three` chunk).

---

## 3. Current Phase Ledger

- **PHASE 0–4:** COMPLETE.
- **PHASE 5 (Resume Upload, Parsing & Editable Preview):** COMPLETE & VERIFIED (`21/21` pytest, `5/5` Vitest, `vite build` green, `0` npm vulnerabilities; browser DevTools screenshots pending Chrome remote-debugging connection).
- **PHASE 6 (Student Resume Builder MVP — 2 Templates + PDF Export + Versioning):** NEXT MILESTONE (awaiting user approval).
