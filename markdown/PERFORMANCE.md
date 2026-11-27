# PERFORMANCE.md — Quantitative Performance & Resource Budgets

---

## 1. Frontend & 3D WebGL Budgets

*(Full 3D hardware budget and fallback audit in [docs/design/3d-performance-budget.md](docs/design/3d-performance-budget.md).)*

| Metric / Asset | Target Budget | Enforcement Mechanism |
|---|---|---|
| **Core JS Shell (gzipped, excl. lazy 3D/Recharts)** | `<= 180 KB` | Route-level `React.lazy()` code splitting; zero 3D/Recharts bundled on critical path. |
| **3D Hero Chunk (`three` + `@react-three/fiber`)** | Lazy-loaded on `/` desktop (`>= 768px`) only | Never loaded on `/builder`, `/analyze`, `/results`, `/history`, mobile (`< 768px`), or `prefers-reduced-motion`. |
| **WebGL Geometry & Draw Calls** | `<= 6,000` triangles, `<= 12` draw calls | Procedural obsidian planes + wireframe scan lines; zero heavy GLB textures, zero shadow maps, zero post-processing bloom passes. |
| **DPR & Frame Lifecycle** | `dpr={[1, 1.75]}`, pause on hidden tab | Dispose geometries/materials on unmount; clamp `frameloop="demand"` or pause when offscreen (`IntersectionObserver`). |
| **CLS & LCP** | `CLS < 0.05`, `LCP < 2.5s` | Left-column editorial Hero H1 & CTA paint immediately in HTML/CSS; right-column 3D reserves fixed aspect container. |

---

## 2. Backend & Memory Budgets (`Render 512 MB Free Tier`)

| Component | Target Budget | Engineering Control |
|---|---|---|
| **Flask Server RSS (`PyMuPDF` + `spaCy en_core_web_sm` + `NLTK` + `ReportLab`)** | `< 320 MB` RSS (headroom under `512 MB`) | Single Gunicorn worker (`--workers 1 --threads 4 --worker-class gthread --preload`); zero neural/HF weights loaded in prod. |
| **Document Parse Latency (2-page PDF/DOCX)** | `< 400 ms` p95 | Single-pass `PyMuPDF` / `python-docx` extraction without spawning subprocesses. |
| **Deterministic Scoring & Matching** | `< 600 ms` p95 | Precompiled `spaCy PhraseMatcher` singleton initialized once on app factory boot. |
| **ReportLab PDF Export (Resume or Audit)** | `< 500 ms` p95 | Direct vector rendering into `io.BytesIO`. |
| **Neon PostgreSQL Queries** | `< 80 ms` warm / `<= 2s` cold wake | `pool_pre_ping=True`, composite workspace indexes, eager `selectinload` preventing N+1 queries. |
