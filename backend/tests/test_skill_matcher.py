from __future__ import annotations

from app.nlp.skill_matcher import evaluate_role_skills, extract_skills_from_sections


def test_punctuation_sensitive_languages_extracted_accurately():
    sections = [
        (
            "skills",
            "Languages: C, C++, C#, R, Go, JavaScript, TypeScript\n"
            "Frameworks: React.js, Node.js, Tailwind CSS\n"
            "Tools: CI/CD, Git",
        ),
        (
            "projects",
            "Built services with Node.js, Python, and R.",
        ),
    ]
    detected = extract_skills_from_sections(sections)

    assert {"c_lang", "cpp", "csharp", "r_lang", "go", "javascript", "typescript"}.issubset(
        detected.keys()
    )
    assert {"react", "nodejs", "tailwind", "ci_cd", "git", "python"}.issubset(detected.keys())
    # JavaScript must NEVER trigger a false positive for Java.
    assert "java" not in detected


def test_ambiguous_short_tokens_do_not_false_positive_in_prose():
    sections = [
        (
            "summary",
            "Completed Grade C chemistry elective and R&D lab review. "
            "Eager to go to work and express interest in software.",
        ),
        (
            "projects",
            "Built an ecommerce site with JavaScript and CSS.",
        ),
    ]
    detected = extract_skills_from_sections(sections)

    assert "c_lang" not in detected
    assert "r_lang" not in detected
    assert "go" not in detected
    assert "java" not in detected
    assert "express" not in detected
    assert "javascript" in detected
    assert "css" in detected


def test_cplusplus_and_csharp_alone_do_not_falsely_trigger_c():
    sections = [("skills", "Languages: C++, C#, Java")]
    detected = extract_skills_from_sections(sections)

    assert "cpp" in detected
    assert "csharp" in detected
    assert "java" in detected
    assert "c_lang" not in detected


def test_missing_keywords_never_claim_candidate_lacks_skill_and_detects_synonym():
    sections = [
        ("skills", "Databases: PostgreSQL\nLanguages: Python"),
    ]
    reqs = [
        {"canonical_key": "sql", "skill_name": "SQL", "category": "database", "requirement_level": "mandatory", "learning_priority": 1},
        {"canonical_key": "tableau", "skill_name": "Tableau", "category": "tool", "requirement_level": "preferred", "learning_priority": 3},
    ]
    evals = {e.canonical_key: e for e in evaluate_role_skills(sections, reqs)}

    assert evals["sql"].match_status == "synonym_matched"
    assert "PostgreSQL" in evals["sql"].status_note
    assert evals["tableau"].match_status == "missing"
    assert "does not prove lack of skill" in evals["tableau"].status_note.lower()
