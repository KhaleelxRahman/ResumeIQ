# BRAIN.md — Persistent Engineering Memory & Technical Context

> Living repository context maintained across phases. Records verified environment facts, finalized decisions, and execution ledger.

---

## 1. Verified Environment & Hosting Limits (Audited 2026-11-26)

| Component | Verified Fact | Engineering Implication |
|---|---|---|
| **Workspace Path** | `C:\Users\KhaleelLocal\Desktop\GitHub Project Shortcuts\ResumeIQ` | GitHub-connected clone (`origin/main`). Backend (`backend/`) and Frontend (`frontend/`) Phases 0–5 verified locally. |
| **Local Toolchain** | `Python 3.13.17`, `Node v26.13.1`, `npm 11.20.0`, `Git 2.56.1` | Phase 4–5 dependencies verified (`Flask 3.1.3`, `SQLAlchemy 2.1.9`, `Pydantic 2.14.4`, `Alembic 1.20.1`, `psycopg-binary 3.3.9`, `PyMuPDF 1.28.2`, `python-docx 1.2.0`). `spaCy`, `NLTK`, and `ReportLab` scheduled for Phases 6–9. |
| **Installed Plugins / MCP** | `agentic-bundle-essentials`, `chrome-devtools-plugin`, unauthenticated `coderabbit`, `netlify`, `sentry`, `supabase` | Zero GitHub/HF/Vercel/Render MCP servers assumed. |
| **Neon Free Tier (Verified Nov 2026)** | `1 GB` Postgres storage/project, `100 CU-hrs/mo`, autoscaling to `2 CU`, **auto-suspend after 5 min inactivity**, `5 GB` egress | Configured SQLAlchemy `pool_pre_ping=True` + `pool_recycle=240`; verified via PG DDL compile; live Neon test awaits Phase 13. |
| **Render Free Tier (Verified Nov 2026)** | `512 MB` RAM, `~0.1` vCPU, `750` hrs/mo, **15-min spin-down (~50–60s cold start)** | Use `gunicorn --workers 1 --threads 4 --worker-class gthread --preload`. |

---

## 2. Finalized Safeguards & Phase 4–5 Hardening Decisions

1. **Server-Issued Workspace Sessions:** `POST /api/workspaces/session` generates `secrets.token_urlsafe(32)`, stores only SHA-256 `token_hash` in `workspaces`, prunes expired sessions cleanly (`purge-expired-workspaces`), rate-limits abuse (`429`), and enforces token + ownership checks on private endpoints (`assert_workspace_ownership`).
2. **Backend (`ADR-001`):** Python Flask `3.1.3` + Pydantic v2 + SQLAlchemy + Alembic (`96cd3747957a` verified across `upgrade`/`downgrade`/`upgrade` on SQLite and compiled against PostgreSQL DDL).
3. **Deterministic Core & Hardened Parser (`ADR-002`):** Pure Python `skill_matcher.py` handles punctuation-sensitive tokens (`C`, `C++`, `C#`, `R`, `Go`, `JavaScript`). Upload pipeline accepts exact `5 MB` files with multipart overhead headroom, sniffs binary magic bytes, streams OOXML ZIP decompression to block small & large ZIP bombs / XML entity bombs, flags vector-outlined scanned PDFs, masks email/phone/LinkedIn/GitHub/portfolio URLs, and recomputes derived fields cleanly on `PATCH` while keeping `raw_text` immutable.
4. **Frontend Shell (`ADR-004`):** React `18.3` + Vite `8.4.0` + TypeScript (`strict: true`) + Tailwind CSS v4 + single-tab-stop Dropzone + `ConfirmDialog` alerts + lazy R3F hero (`min-h-[420px]`, `612` tris, `webglcontextlost`/`restored` handling, unused `@react-three/drei` removed; core JS shell `~76.8 kB` gzipped + lazy `212.83 kB` gzipped `vendor-three` chunk).

---

## 3. Current Phase Ledger

- **PHASE 0–5:** COMPLETE & VERIFIED (backend/frontend automated checks, Alembic cycle, and live Playwright Chromium `156.0.8078.4` E2E verification across viewports and interactive flows).
- **PHASE 6–10 (Builder MVP, 100-pt Scoring, Role Skill Gap Engine, Feedback, Dashboard & PDF Reports):** NOT IMPLEMENTED (awaiting explicit approval for Phase 6).
