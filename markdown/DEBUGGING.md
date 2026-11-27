# DEBUGGING.md — Diagnostics & Troubleshooting Playbook

---

## 1. Document Parsing Issues

| Symptom | Likely Root Cause | Resolution |
|---|---|---|
| DOCX missing Education or Skills | Candidate used Word Tables or Headers/Footers | Verify `docx_parser.py` extracts `doc.tables` (deduplicating merged cells) and section headers/footers alongside `doc.paragraphs`. |
| PDF lines merge across columns | Two-column layout read left-to-right across boundary | Inspect `fitz` block `x0`/`x1` bounding boxes; sort column clusters top-to-bottom and attach `MULTI_COLUMN_LAYOUT` parse warning. |
| Valid PDF returns `< 80` chars | Image-only scan (flattened Canva export or photo PDF) | Verify raster image area check returns `422 SCANNED_PDF_DETECTED` with recovery guidance. |

---

## 2. NLP & Scoring Edge Cases

- **False hit on `Java` inside `JavaScript` or `C`/`Go`:** Verify `skill_aliases.json` orders longest multi-word tokens first and applies punctuation-safe boundary assertions + context rules (`C`, `R`, `Go`).
- **Unexpected low score for Fresher resume:** Confirm `experience_track="student_fresher"` was selected and Parameter #6 reallocated Internship weight to Project Depth / Hackathons.

---

## 3. Flask, Neon & Render Runtime Issues

- **Neon Connection Drop After 5-Minute Inactivity (`psycopg.OperationalError` / SSL closed):** Confirm SQLAlchemy engine enables `pool_pre_ping=True` and `pool_recycle=240` so pooled connections refresh seamlessly when Neon wakes from scale-to-zero.
- **Render 512 MB OOM Crash:** Verify Gunicorn uses `--workers 1 --threads 4 --worker-class gthread --preload` and `en_core_web_sm` (never `md`/`lg` or neural transformer weights).
- **Render 15-Minute Sleep Cold Start (`~50–60s`):** Confirm frontend `services/api.ts` pings `GET /api/health` on studio/builder entry and shows non-blocking warm-up UI with retry rather than timing out in 5 seconds.
- **CORS Preflight Error on `X-Workspace-Token` or PDF Filename:** Confirm `Flask-CORS` lists `X-Workspace-Token` in `allow_headers` and `Content-Disposition` in `expose_headers`.
