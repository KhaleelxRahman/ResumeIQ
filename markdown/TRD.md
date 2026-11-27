# TRD.md — Technical Requirements Document & Hugging Face Evaluation

---

## 1. Finalized Phase 2 Technology Stack

| Layer | Approved Choice | Rationale & SkillOrbit Alignment |
|---|---|---|
| **Frontend** | React `18.3`, TypeScript `5.7`, Vite `8.4`, Tailwind CSS `v4`, React Router `v7` | React `18.3` guarantees stable compatibility with `@react-three/fiber@8` and Vite `8.4` Rolldown bundling. |
| **3D & Motion** | `three`, `@react-three/fiber`, `framer-motion` *(GSAP excluded from workspace; unused `@react-three/drei` removed)* | Enforces strict `<= 6,000` triangle (`612` actual) and `<= 180 KB` shell (`76.8 kB` gzip) budgets ([3d-performance-budget.md](docs/design/3d-performance-budget.md)). |
| **Charts & Icons** | `lucide-react` *(live)*; `recharts` *(scheduled Phase 10)* | Lucide active across routes; Recharts reserved for Results/History dashboards. |
| **Backend** | **Python Flask `3.1`**, **Flask-CORS**, **Pydantic v2**, **SQLAlchemy `2.1`**, **Alembic**, **Gunicorn (`gthread` on Unix)** | Matches SkillOrbit PDF p. 6 (`Backend: Python Flask`) verbatim while retaining Pydantic v2 DTO contracts and framework-free domain modules (`ADR-001`). |
| **Database** | **Neon PostgreSQL** (production target via `DATABASE_URL` + `psycopg`), **SQLite** (verified local dev & `pytest`) | Eliminates ephemeral Render disk data loss; Neon compatibility verified via PG DDL compilation; live Neon test awaits Phase 13. |
| **Parsing & PDF** | `PyMuPDF` (`fitz`), `python-docx` *(live Phase 5)*; `ReportLab` *(scheduled Phases 6 & 10)* | Coordinate-aware PDF blocks, DOCX paragraph+table extraction, bounded streaming ZIP inspection; ReportLab deferred to Phase 6. |
| **Core AI / NLP** | Deterministic regex/boundary/disambiguation `skill_matcher` *(live Phases 4–5)*; `spaCy` + `NLTK` *(scheduled Phases 7–8)* | 100% deterministic & SkillOrbit-compliant; `spaCy`/`NLTK` intentionally deferred to Phase 7–8 installation. |
| **Testing** | `pytest`, Flask `app.test_client()`, `Vitest`, `@testing-library/react`, `Playwright` *(Phases 0–5 E2E verified; Phase 12 full regression)* | Automated unit & integration suites plus Phase 0–5 Playwright Chromium E2E active; full suite target in Phase 12. |

> **Python 3.13.17 Local Runtime Note:** Pre-built wheels for Phases 4–5 (`Flask 3.1.3`, `pydantic 2.14.4`, `SQLAlchemy 2.1.9`, `alembic 1.20.1`, `psycopg-binary 3.3.9`, `PyMuPDF 1.28.2`, `python-docx 1.2.0`) are installed and verified inside `backend/.venv`. `spacy`, `nltk`, and `reportlab` are scheduled for Phases 6–9 installation.

---

## 2. Hugging Face Model Policy & Candidate Evaluation (`ADR-002`)

Per **SkillOrbit Scope Limitations (p. 7)**, Deep Learning models and LLM training are **excluded** from the required capstone core. All scoring, ATS checks, skill matching, and feedback remain deterministic. Below is the documented engineering evaluation of the 6 candidate Hugging Face models:

| Model ID | Purpose | License | Params | Est. Footprint (FP32 / FP16 / ONNX Int8) | CPU/GPU Fit | Core Status (`ResumeIQ v1`) |
|---|---|---|---|---|---|---|
| [`sentence-transformers/all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | English sentence similarity (`384d`) | **Apache 2.0** | ~22.7M | ~90 MB / ~45 MB / ~25 MB | Good CPU | **Disabled by default** (`ENABLE_HF_EMBEDDINGS=false`); optional offline experiment only. |
| [`BAAI/bge-small-en-v1.5`](https://huggingface.co/BAAI/bge-small-en-v1.5) | English dense retrieval (`384d`, `512` ctx) | **MIT** | ~33.4M | ~135 MB / ~67 MB / ~38 MB | Good CPU | **Disabled by default** (`ENABLE_HF_EMBEDDINGS=false`); optional offline benchmark only. |
| [`BAAI/bge-m3`](https://huggingface.co/BAAI/bge-m3) | Multilingual dense+sparse+multi-vector (`1024d`, `8192` ctx) | **MIT** | ~567–568M | ~2.2 GB / ~1.1 GB | Too heavy for 512 MB CPU | **Rejected / Postponed** — breaks RAM budget and unnecessary for English student resumes. |
| [`BAAI/bge-reranker-v2-m3`](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Multilingual cross-encoder pair reranker (`8192` ctx) | **Apache 2.0** | ~568M | ~2.2 GB / ~1.1 GB | Too slow on CPU (`O(N×M)`) | **Rejected / Postponed** — cross-encoder pair latency unsuitable on CPU. |
| [`Qwen/Qwen3-Embedding-0.6B`](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) | Long-context (`32K`) dense embeddings | **Apache 2.0** | ~0.6B | ~2.4 GB / ~1.2 GB | Heavy CPU; GPU suited | **Rejected / Postponed** — oversized for 1–2 page student resumes. |
| [`Qwen/Qwen3-4B-Thinking-2507`](https://huggingface.co/Qwen/Qwen3-4B-Thinking-2507) | Thinking-mode causal LLM (`36` layers, `256K` ctx) | **Apache 2.0** | ~4.0B | ~16 GB / ~8 GB / ~3 GB 4-bit | GPU required; high `<think>` latency | **Excluded from Core** — incompatible with free CPU hosting, SkillOrbit no-DL constraint, and zero-cost pledge. |

### Privacy, Cost & Fallback Guarantees
- **Core Cost & Privacy:** `$0` inference cost; `0 bytes` of student resume text leave the host server.
- **Fallback Strategy:** Even if `ENABLE_HF_EMBEDDINGS` is experimentally benchmarked offline, production scoring and feedback never depend on neural models or external APIs.
