# SYSTEM_INSTRUCTIONS.md — Non-Negotiable Product & AI Integrity Constraints

All engineers and AI agents contributing to **ResumeIQ** must enforce these system-level invariants at both design time and runtime.

---

## 1. Truthfulness & Anti-Fabrication Invariants

1. **Zero Fabricated Credentials:** ResumeIQ must NEVER invent or auto-insert unverified work experience, internships, job titles, companies, GPAs, certifications, projects, tools, or quantitative metrics (`"improved speed by 40%"`) that the student did not supply.
   - When demonstrating bullet rewriting, placeholders such as `[X%]` or `[metric]` must explicitly mark missing user-supplied quantities.
2. **Zero Fake Scores:** Scores (`0–100`) must NEVER come from an LLM prompt, random heuristic, or hardcoded demo constant. Every point awarded or deducted must trace deterministically to documented rubric criteria in `markdown/docs/database/scoring-rubric-spec.md`.
3. **Honest Parsing Limitations:**
   - If a PDF is image-only (scanned) and OCR is disabled/unavailable, return an explicit `SCANNED_PDF_DETECTED` error—never report `"0 skills found"` as if the candidate lacked skills.
   - If a resume section is ambiguous or multi-column extraction drops text, emit structured `parse_warnings` visible in the UI.
4. **Honest Role & ATS Semantics:**
   - Always label the ATS score as an **ATS Compatibility Estimate (Simulation)**, never a guarantee of passing any employer's specific ATS (Workday, Greenhouse, Lever, Taleo, etc.).
   - Always frame missing role terms as **"Not detected in resume text"**—never assert *"Candidate lacks this skill."*
   - Never promise internships, stipends, certificates, interviews, or job placement.

---

## 2. Student-First Fairness Rules

- **No Unfair Experience Penalty:** A college student or fresh graduate with zero full-time corporate employment must be able to score **85–100/100** on Resume Quality through strong academic details, technical skills, genuine projects, internships/hackathons, and clear structure.
- **Free Core Workflow:** Never lock Resume Builder basics, PDF/DOCX upload, parsing preview, 100-pt scoring, ATS estimate, core 4 role matching, basic feedback, or PDF export behind a paywall or forced signup wall.

---

## 3. Privacy & Security Guardrails

- Treat every uploaded or authored resume as **sensitive Personally Identifiable Information (PII)**.
- **Never log** raw resume text, phone numbers, emails, street addresses, tokens, or API keys to stdout, application logs, Sentry events, or analytics.
- **Never transmit** resume text to Hugging Face Inference API or any third-party LLM provider unless:
  1. The feature is explicitly enabled by configuration, AND
  2. The user gives explicit, informed UI consent for that action, AND
  3. Direct PII (email, phone, personal URLs, street address) is redacted prior to transmission whenever rewriting isolated bullets.
- **Immediate File Disposal:** Delete temporary uploaded PDF/DOCX files immediately after text extraction completes.

---

## 4. Verification Honesty

- Never report an API, build, test suite, or deployment as verified unless executed against real runtime dependencies with observed passing output.
- If an external integration or MCP server is unavailable or unauthenticated, state that status explicitly rather than mocking success silently.
