# ADR-002: Deterministic NLP Core & SkillOrbit No-Deep-Learning Compliance

- **Status:** Accepted (Phase 2 Sign-Off)
- **Date:** 2026-11-26
- **Context:**
  - **SkillOrbit Capstone PDF (p. 7 — Scope Limitations)** explicitly states: *"Students are advised NOT to include: Deep Learning models, Large Language Model training, Complex recommendation engines..."* and specifies `AI/NLP Libraries: spaCy, NLTK` (p. 6) and `Learning Outcomes: Rule-based AI logic` (p. 4).
  - The Master Directive requested evaluating 6 Hugging Face models while preserving deterministic scoring and offline operation.
- **Decision:**
  1. **100% Deterministic Core:** All Resume Quality scores (`0–100`), ATS Compatibility Estimates (`0–100`), Role Skill Matches, Custom JD extraction, and Smart Feedback run strictly on deterministic rules, `PyMuPDF`, `python-docx`, `spaCy` (`en_core_web_sm` tokenization, lemmatization, noun chunks, `PhraseMatcher`), `NLTK` (`stopwords`, `punkt_tab`, TF-IDF), and curated taxonomies.
  2. **Qwen LLMs & Paid External Inference Excluded from Core:** `Qwen/Qwen3-4B-Thinking-2507` and any paid external LLM inference APIs are **rejected from the required product core**—violating neither SkillOrbit's no-deep-learning boundary nor the free-first, privacy-first, 512 MB RAM constraints.
  3. **Optional Embedding Benchmarking Gated Off:** Lightweight CPU embeddings (`sentence-transformers/all-MiniLM-L6-v2` / `BAAI/bge-small-en-v1.5`) remain **disabled by default (`ENABLE_HF_EMBEDDINGS=false`)** and may only be benchmarked in a separate offline/optional script if explicitly permitted without altering production scoring.
  4. **Rule-Based Bullet Coaching:** Bullet improvement suggestions use deterministic pattern detection (weak passive verbs, missing tech stack attribution, missing `[metric]` placeholders) without LLM generation.
- **Consequences:** Full compliance with SkillOrbit Scope Limitations, zero risk of hallucinated scores or fabricated achievements, and safe memory usage under Render's 512 MB RAM cap.
