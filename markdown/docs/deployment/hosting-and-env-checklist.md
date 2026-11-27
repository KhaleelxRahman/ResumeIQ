# Hosting, Neon/Render Limits & Environment Checklist

---

## 1. Pre-Deployment Verification Checklist

- [ ] **Re-verify live Neon PostgreSQL & Render free-tier terms** immediately prior to Phase 13 deploy.
- [ ] Neon Postgres project created (`1 GB` storage / `100 CU-hrs/mo` free tier baseline verified Nov 2026); `DATABASE_URL` configured with `sslmode=require`.
- [ ] SQLAlchemy configured with `pool_pre_ping=True` and `pool_recycle=240` for Neon 5-minute auto-suspend recovery.
- [ ] `alembic upgrade head` passes cleanly against Neon database.
- [ ] Render build script pre-downloads `en_core_web_sm` and NLTK `stopwords`/`punkt_tab` (never runtime downloads).
- [ ] Gunicorn configured as `--workers 1 --threads 4 --worker-class gthread --preload --timeout 120` to stay under Render's `512 MB` RAM limit.
- [ ] `ENABLE_HF_EMBEDDINGS=false` and `ENABLE_DOCX_BUILDER_EXPORT=false` verified in initial core production deploy.
- [ ] `CORS_ORIGINS` locked strictly to exact Vercel origin (`X-Workspace-Token` allowed, `Content-Disposition` exposed).
- [ ] `vercel.json` rewrite configured for React Router paths.

---

## 2. Environment Variable Matrix

| Variable | Side | Local Dev Default | Production Requirement |
|---|---|---|---|
| `FLASK_ENV` | Backend | `development` | `production` |
| `DATABASE_URL` | Backend | `sqlite:///./resumeiq_dev.db` | `postgresql+psycopg://...` (Neon secret) |
| `CORS_ORIGINS` | Backend | `http://localhost:5173` | `https://resumeiq.vercel.app` |
| `MAX_UPLOAD_BYTES` | Backend | `5242880` | `5242880` |
| `ENABLE_HF_EMBEDDINGS` | Backend | `false` | `false` |
| `ENABLE_DOCX_BUILDER_EXPORT` | Backend | `false` | `false` |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:5000/api` | `https://<render-app>.onrender.com/api` |
