# DEPLOYMENT.md — Production Architecture, Neon & Render Guide

---

## 1. Target Topology

| Service | Host | Configuration |
|---|---|---|
| **Frontend (`frontend/`)** | **Vercel** | Vite static SPA build (`dist/`), `vercel.json` catch-all rewrite, edge HTTPS. |
| **Backend (`backend/`)** | **Render Web Service** | Python Flask `3.x` + Gunicorn (`gthread`), `PyMuPDF`, `python-docx`, `spaCy en_core_web_sm`, `NLTK`, `ReportLab`. |
| **Database** | **Neon PostgreSQL** | Persistent managed Postgres (`DATABASE_URL=postgresql+psycopg://...`) via SQLAlchemy 2.0 + Alembic. |

---

## 2. Verified Free-Tier Limits & Guardrails (Audited Nov 2026)

> **Pre-Deploy Action:** Re-verify current provider pricing/limits immediately before Phase 13 production deployment.

- **Neon PostgreSQL Free Tier:** `$0/mo`, up to `100` projects, `1 GB` Postgres storage per project, `100 CU-hours/mo`, autoscaling up to `2 CU`, `10` branches/project, `5 GB` egress/project, **auto-suspends after 5 minutes of inactivity**.
  - *Mitigation:* Enable SQLAlchemy `pool_pre_ping=True` and `pool_recycle=240` so Flask transparently reconnects after Neon scales to zero.
- **Render Free Web Service:** `512 MB` RAM, `~0.1` fractional vCPU, `750` free instance hours/month, **spins down after 15 minutes of inactivity (~50–60s cold start)**.
  - *Mitigation:* Never spawn multi-worker forks (`--workers 1 --threads 4 --worker-class gthread --preload --timeout 120`) so `spaCy en_core_web_sm` stays loaded once safely under `512 MB` RAM. Frontend quietly polls `GET /api/health` on entry and displays a calm *"Waking analysis server..."* status banner during cold starts.

---

## 3. Render Build & Start Commands

1. **Build (`backend/build.sh`):**
   ```bash
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   python -m nltk.downloader stopwords punkt_tab
   alembic upgrade head
   ```
2. **Start:**
   ```bash
   gunicorn "app:create_app()" --workers 1 --threads 4 --worker-class gthread --preload --bind 0.0.0.0:$PORT --timeout 120
   ```

---

## 4. Required Environment Variables

### Backend
- `FLASK_ENV=production`
- `DATABASE_URL=postgresql+psycopg://...` *(Neon connection string with `sslmode=require`, never committed)*
- `CORS_ORIGINS=https://your-resumeiq.vercel.app`
- `MAX_UPLOAD_BYTES=5242880`
- `ENABLE_HF_EMBEDDINGS=false`
- `ENABLE_DOCX_BUILDER_EXPORT=false`

### Frontend
- `VITE_API_BASE_URL=https://your-resumeiq-api.onrender.com/api`
