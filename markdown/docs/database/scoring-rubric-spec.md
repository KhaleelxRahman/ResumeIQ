# Deterministic Scoring Rubric Specification (`v1.0.0`)

All scores in ResumeIQ are computed deterministically without LLM judgment or randomness. Every awarded or deducted point outputs `{ criterion, earned, max, evidence, deduction_reason }`.

---

## 1. Resume Quality Score (`0–100`)

### Dimension 1: Resume Structure & Readability (`20 pts`)
- **ATS Heading Recognition (6 pts):** `>= 4` standard section types detected (`1.5 pts` each, capped at `6`).
- **Logical Section Ordering (3 pts):** Contact/Header at top, Education/Skills/Projects/Experience cleanly separated (`3 pts`; `-1.5` per detected out-of-order anomaly).
- **Layout & Parseability Hygiene (3 pts):** `3 pts` for clean single-column linear extraction; `-1.5` for multi-column reorder risk; `-1.5` for heavy table dependency.
- **Readability & Bullet Discipline (8 pts):**
  - Bullet usage in Projects/Experience (`4 pts` if `>= 60%` of entry lines use concise bullet structures).
  - Action-verb & clarity check (`4 pts` if `>= 50%` of bullets begin with strong technical verbs and average bullet length `< 32` words).

### Dimension 2: Skills Section (`20 pts`)
- **Dedicated Skills Block (6 pts):** Explicit `Skills` / `Technical Skills` section found (`6 pts`; `2 pts` if skills only scattered across prose).
- **Categorized Organization (2 pts):** Skills grouped into `>= 2` logical sub-labels (e.g., `Languages:`, `Frameworks:`, `Tools:`).
- **Calibrated Technical Breadth (12 pts):** Counts unique canonical technical skills detected:
  - `>= 10` skills: `12 pts` | `6–9` skills: `9 pts` | `3–5` skills: `5 pts` | `1–2` skills: `2 pts`.
  - *Keyword Stuffing Guard:* If `> 45` skill tokens appear with `< 2` project/experience evidence citations, emit a stuffing warning and cap breadth at `8 pts`.

### Dimension 3: Education Details (`15 pts`)
- Degree / Diploma / B.Tech / B.Sc / MCA identifier detected (`6 pts`).
- Institution / University indicator detected (`4 pts`).
- Graduation year or date range detected (`3 pts`).
- GPA / CGPA / Relevant Coursework detected (`2 pts`).

### Dimension 4: Projects Section (`15 pts`)
- Dedicated Projects section with `>= 2` distinct entries (`6 pts`; `1` entry = `3 pts`).
- Technical stack attribution inside project descriptions (`5 pts`: `>= 2` canonical tools/languages cited in project blocks).
- Concrete engineering scope / outcome phrasing (`4 pts`: problem + implementation + observable result or architecture).

### Dimension 5: Contact Information (`10 pts`)
- Valid email format detected (`3 pts`).
- Valid phone pattern detected (`2 pts`).
- Professional technical link (`GitHub`, `LinkedIn`, or `Portfolio`) detected (`3 pts`: `1.5 pts` each up to `3`).
- Clear candidate header label present in top 5 lines (`2 pts`).

### Dimension 6: Completeness, Experience & Achievements (`20 pts` — Conditional Fairness)
- **Track A (`student_fresher`):**
  - *Experience / Internships OR Project Substitution (`6 pts`):* Full `6 pts` if internship/work experience present, **OR** automatically grants up to `6 pts` when `>= 3` detailed technical projects or hackathon/leadership activities exist (zero unfair penalty for freshers!).
  - *Achievements & Certifications (`6 pts`):* `3 pts` for certifications/courses, `3 pts` for awards/hackathons/coding profiles.
  - *Summary & Healthy Word Budget (`8 pts`):* `3 pts` for crisp 2–4 line profile/objective; `5 pts` for balanced `300–900` word density (`< 180` words = `1 pt`; `> 1,300` words = `2 pts`).
- **Track B (`junior` / `mid`):**
  - *Work Experience & Quantified Bullets (`10 pts`):* Dedicated Experience section (`5 pts`) + role dates & quantified impact (`5 pts`).
  - *Achievements & Certifications (`4 pts`)*.
  - *Summary & Word Budget (`6 pts`)*.

---

## 2. Role Skill Match (`0–100%`)

$$\text{SkillMatch\%} = 100 \times \frac{\sum_{s \in \text{Role}} w_s \cdot \text{credit}(s)}{\sum_{s \in \text{Role}} w_s}$$

Where:
- `mandatory` skill weight $w_s = 2.0$; `preferred` skill weight $w_s = 1.0$.
- `credit(s)`: `matched` = `1.0`, `synonym_matched` = `0.75`, `uncertain` = `0.25`, `missing` = `0.0`.

---

## 3. ATS Compatibility Estimate (`0–100`)

$$\text{ATSEstimate} = \text{round}\big(0.30 \cdot P_{\text{parse}} + 0.20 \cdot S_{\text{std}} + 0.35 \cdot \text{SkillMatch\%} + 0.15 \cdot R_{\text{clarity}}\big)$$

- $P_{\text{parse}}$: `100` minus layout penalties (`-25` multi-column table overlap, `-15` non-standard encoding/broken hyphens, `-20` missing contact outside main body).
- $S_{\text{std}}$: Percentage of expected core section headings matching standard ATS labels.
- $R_{\text{clarity}}$: Action-verb density and absence of extreme wall-of-text paragraphs.
- **Display Rule:** Always rendered beside a disclaimer stating this is an automated screening simulation, not an employer ATS guarantee.
