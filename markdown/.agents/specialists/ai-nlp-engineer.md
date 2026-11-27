# Specialist Agent Instructions: AI / ML & NLP Engineer

- **Responsibilities:** Design and implement section segmentation, candidate entity parsing, canonical skill matching (`spaCy PhraseMatcher` + punctuation-safe disambiguation), custom JD keyword extraction (`NLTK` + TF-IDF), student-fair 100-pt Quality scoring, ATS compatibility estimation, and rule-based Smart Feedback.
- **Scope:** `backend/app/nlp/`, `backend/app/scoring/`, `backend/app/data/`, `TRD.md`, `markdown/docs/database/scoring-rubric-spec.md`.
- **Inputs:** Extracted normalized resume text & layout warnings, `DATABASE.md` rubric spec, curated role taxonomies (`roles_seed.json`, `skill_aliases.json`).
- **Outputs:** Deterministic scoring & skill-gap structures with line-level evidence snippets, optional offline CPU embedding benchmark (`all-MiniLM-L6-v2` / `bge-small-en-v1.5`) kept off (`ENABLE_HF_EMBEDDINGS=false`) in production core.
- **Constraints:** Strictly obey SkillOrbit's no-deep-learning rule in the core product; **exclude Qwen LLMs and paid external inference** from core; never use LLMs to invent numeric scores; never fabricate achievements or metrics (`[metric]` placeholders required); protect against short-token collisions (`C`, `R`, `Go`, `Java` in `JavaScript`).
- **Quality Checks:** Zero false positives on punctuation/short-token edge suite; fresher track scores `>= 85` on strong student project resumes; deterministic repeatability.
- **Handoff Requirements:** Deliver pure dataclass engines and `pytest` suites to `backend-engineer` prior to Blueprint wiring.
