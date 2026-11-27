# DEPLOYMENT.md — Production Architecture, Neon & Render Guide

---

## 1. Target Topology

| Service | Host | Configuration |
|---|---|---|
| **Frontend (`frontend/`)** | **Vercel** | Vite `8.4` static SPA build (`dist/`), `vercel.json` catch-all rewrite, edge HTTPS. |
| **Backend (`backend/`)** | **Render Web Service** | Python Flask `3.1` + Gunicorn (`gthread`), `PyMuPDF`, `python-docx` *(plus `spaCy`, `NLTK`, `ReportLab` scheduled across Phases 6–9)*. |
| **Database** | **Neon PostgreSQL** *(Phase 13 deploy target)* | Managed Postgres (`DATABASE_URL=postgresql+psycopg://...`) via SQLAlchemy 2.1 + Alembic. Compatibility verified via PostgreSQL DDL compilation; live Neon test pending Phase 13. |

---

## 2. Verified Free-Tier Limits & Guardrails (Audited Nov 2026)

> **Pre-Deploy Action:** Re-verify current provider pricing/limits immediately before Phase 13 production deployment.

- **Neon PostgreSQL Free Tier:** `$0/mo`, up to `100` projects, `1 GB` Postgres storage per project, `100 CU-hours/mo`, autoscaling up to `2 CU`, `10` branches/project, `5 GB` egress/project, **auto-suspends after 5 minutes of inactivity**.
  - *Mitigation:* Enable SQLAlchemy `pool_pre_ping=True` and `pool_recycle=240` so Flask transparently reconnects after Neon scales to zero.
- **Render Free Web Service:** `512 MB` RAM, `~0.1` fractional vCPU, `750` free instance hours/month, **spins down after 15 minutes of inactivity (~50–60s cold start)**.
  - *Mitigation:* Never spawn multi-worker forks (`--workers 1 --threads 4 --worker-class gthread --preload --timeout 120`) so `spaCy en_core_web_sm` stays loaded once safely under `512 MB` RAM. Frontend quietly polls `GET /api/health` on entry and displays a calm *"Waking analysis server..."* status banner during cold starts.

---

## 3. Render Build & Start Commands

1. **Current Phase 4–5 Build (`backend/build.sh`):**
   ```bash
   pip install -r requirements.txt
   alembic upgrade head
   flask --app run.py seed-db
   ```
2. **Future Phase 7–9 Additions (once `spaCy` & `NLTK` are installed):**
   ```bash
   python -m spacy download en_core_web_sm
   python -m nltk.downloader stopwords punkt_tab
   ```
3. **Production Start (Unix/Render):**
   ```bash
   gunicorn "app:create_app()" --workers 1 --threads 4 --worker-class gthread --preload --bind 0.0.0.0:$PORT --timeout 120
   ```
4. **Local Maintenance & Dev Server:**
   ```bash
   flask --app run.py purge-expired-workspaces
   python run.py  # honors FLASK_ENV / FLASK_DEBUG (never forces debug=True in production)
   ```

---

## 4. Required Environment Variables

### Backend
- `FLASK_ENV=production` *(omit `FLASK_DEBUG` in production)*
- `HOST=127.0.0.1` / `PORT=5000`
- `DATABASE_URL=postgresql+psycopg://...` *(Neon connection string with `sslmode=require`, never committed)*
- `CORS_ORIGINS=https://your-resumeiq.vercel.app`
- `MAX_UPLOAD_BYTES=5242880`
- `MULTIPART_OVERHEAD_BYTES=262144`
- `WORKSPACE_TTL_DAYS=30`
- `MAX_RESUMES_PER_WORKSPACE=25`
- `RATE_LIMIT_ENABLED=true`
- `RATE_LIMIT_SESSION_PER_MIN=20`
- `RATE_LIMIT_UPLOAD_PER_MIN=15`
- `RATE_LIMIT_DELETE_PER_MIN=20`
- `ENABLE_HF_EMBEDDINGS=false`
- `ENABLE_DOCX_BUILDER_EXPORT=false`

### Frontend
- `VITE_API_BASE_URL=https://your-resumeiq-api.onrender.com/api`
