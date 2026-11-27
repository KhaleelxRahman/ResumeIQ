# TRD.md — Technical Requirements Document & Hugging Face Evaluation

---

## 1. Finalized Phase 2 Technology Stack

| Layer | Approved Choice | Rationale & SkillOrbit Alignment |
|---|---|---|
| **Frontend** | React `18.3`, TypeScript `5.x`, Vite `6.x`, Tailwind CSS `v4`, React Router `v6/v7` | React `18.3` guarantees stable compatibility with `@react-three/fiber@8` and `@react-three/drei@9`. |
| **3D & Motion** | `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion` *(plus strictly bounded GSAP only if needed for static scroll scrub on Landing)* | Enforces strict `<= 6,000` triangle and `<= 180 KB` shell budgets (`markdown/docs/design/3d-performance-budget.md`). |
| **Charts & Icons** | `recharts`, `lucide-react` | Recharts for radar/bar/trend charts; Lucide for uniform vector iconography. |
| **Backend** | **Python Flask `3.x`**, **Flask-CORS**, **Pydantic v2**, **SQLAlchemy `2.0`**, **Alembic**, **Gunicorn (`gthread`)** | Matches SkillOrbit PDF p. 6 (`Backend: Python Flask`) verbatim while retaining Pydantic v2 DTO contracts and framework-free domain modules (`ADR-001`). |
| **Database** | **Neon PostgreSQL** (production via `DATABASE_URL` + `psycopg`), **SQLite** (local dev & `pytest`) | Eliminates ephemeral Render disk data loss; Neon free tier (`1 GB` storage, `100 CU-hrs/mo`, 5-min auto-suspend) handled via `pool_pre_ping=True`. |
| **Parsing & PDF** | `PyMuPDF` (`fitz`), `python-docx`, `ReportLab` | Coordinate-aware PDF blocks, DOCX paragraph+table extraction, pure-Python ReportLab PDF resumes & audit reports. |
| **Core AI / NLP** | `spaCy` (`en_core_web_sm`), `NLTK` (`stopwords`, `punkt_tab`), pure-Python TF-IDF & canonical skill matcher | 100% deterministic & SkillOrbit-compliant (`p. 6`: *spaCy and NLTK*); `< 250–350 MB` RSS fits Render's 512 MB cap cleanly. |
| **Testing** | `pytest`, Flask `app.test_client()`, `Vitest`, `@testing-library/react`, `Playwright` | Automated unit, integration, and responsive UI verification. |

> **Python 3.13.17 Local Runtime Note:** Since the local environment runs `Python 3.13.17`, Phase 4 setup will verify pre-built binary wheels for `Flask`, `pydantic`, `psycopg[binary]`, `PyMuPDF`, `python-docx`, `spacy`, `nltk`, and `reportlab` inside the project venv prior to locking `requirements.txt`.

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
