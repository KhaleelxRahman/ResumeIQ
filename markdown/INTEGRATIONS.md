# INTEGRATIONS.md — External Services & Integration Policy

---

## 1. Integration Philosophy

**ResumeIQ's core pipeline must remain 100% functional without any external AI/API provider.** Core scoring, ATS estimation, skill matching, and feedback run locally on deterministic Python engines (`PyMuPDF`, `python-docx`, `spaCy`, `NLTK`, `ReportLab`). **Qwen LLMs and paid external inference providers are excluded from the required core (`ADR-002`).**

---

## 2. Core Infrastructure Integrations

| Service | Purpose | Configuration | Fallback |
|---|---|---|---|
| **Neon PostgreSQL** | Persistent production relational DB (`1 GB` storage, `100 CU-hrs/mo`, 5-min auto-suspend) | `DATABASE_URL` env var (`sslmode=require`, `pool_pre_ping=True`) | Local SQLite for dev & `pytest` |
| **Vercel** | Static SPA hosting for Vite React bundle | `VITE_API_BASE_URL` env var | Netlify / local Vite preview |
| **Render** | Python Flask + `spaCy` + `ReportLab` web host (`512 MB` RAM free tier) | `CORS_ORIGINS`, `DATABASE_URL`, `MAX_UPLOAD_BYTES` | Local Flask/Gunicorn server |
| **GitHub** | Source control, CI (`pytest` + `Vitest`), SkillOrbit deliverable link | Standard Git SSH/HTTPS | Local Git repo |

---

## 3. Optional / Experimental Integrations (Disabled by Default)

| Integration | Status | Privacy & Compliance Gate |
|---|---|---|
| **Lightweight Local Embeddings (`all-MiniLM-L6-v2` / `bge-small-en-v1.5`)** | `ENABLE_HF_EMBEDDINGS=false` | Only benchmarked offline/locally if explicitly permitted without violating SkillOrbit's no-deep-learning rule; zero external data egress; never modifies deterministic scores. |
| **Sentry Error Tracking** | Optional (`SENTRY_DSN` unset by default) | Must use `send_default_pii=False` and `before_send` body scrubbing so uploaded resume text or tokens are never transmitted. |
