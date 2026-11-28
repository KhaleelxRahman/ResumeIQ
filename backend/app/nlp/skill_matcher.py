from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable


_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "skill_aliases.json"
_BOUNDARY_CHARS = r"A-Za-z0-9_+#."


@dataclass(frozen=True, slots=True)
class SkillEntry:
    canonical_key: str
    display_name: str
    category: str
    aliases: tuple[str, ...]
    disambiguation: str
    implies: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class DetectedSkill:
    canonical_key: str
    display_name: str
    category: str
    matched_alias: str
    section: str
    snippet: str
    start: int
    end: int


@dataclass(frozen=True, slots=True)
class RoleMatchEvaluation:
    skill_name: str
    canonical_key: str
    category: str
    requirement_level: str
    match_status: str  # matched | synonym_matched | uncertain | missing
    evidence_section: str | None
    evidence_snippet: str | None
    learning_priority: int | None
    status_note: str


@lru_cache(maxsize=1)
def load_skill_taxonomy() -> tuple[SkillEntry, ...]:
    """Load canonical skills and aliases from JSON once and cache deterministically."""
    raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    entries: list[SkillEntry] = []
    for item in raw["skills"]:
        entries.append(
            SkillEntry(
                canonical_key=item["canonical_key"],
                display_name=item["display_name"],
                category=item["category"],
                aliases=tuple(item["aliases"]),
                disambiguation=item.get("disambiguation", "standard"),
                implies=tuple(item.get("implies", [])),
            )
        )
    return tuple(entries)


def _build_boundary_regex(alias: str, case_sensitive: bool) -> re.Pattern[str]:
    escaped = re.escape(alias)
    pattern = rf"(?<![{_BOUNDARY_CHARS}]){escaped}(?![A-Za-z0-9_+#])(?!\.[A-Za-z0-9])"
    flags = 0 if case_sensitive else re.IGNORECASE
    return re.compile(pattern, flags)


def _extract_snippet(text: str, start: int, end: int, radius: int = 55) -> str:
    left = max(0, start - radius)
    right = min(len(text), end + radius)
    snippet = " ".join(text[left:right].split())
    if left > 0:
        snippet = "..." + snippet
    if right < len(text):
        snippet = snippet + "..."
    return snippet[:300]


def _passes_disambiguation(
    entry: SkillEntry,
    alias: str,
    text: str,
    start: int,
    end: int,
    section_name: str,
) -> bool:
    mode = entry.disambiguation
    matched_token = text[start:end]
    before = text[max(0, start - 24) : start]
    after = text[end : min(len(text), end + 28)]
    window = f"{before}{matched_token}{after}"

    if mode == "strict_c":
        if matched_token != "C":
            return False
        if re.search(r"\b(grade|option|section|part|track|vitamin|series|group)\s+$", before, re.IGNORECASE):
            return False
        if re.match(r"^\s*&", after):
            return False
        has_delimiter = bool(re.search(r"([,/:|(&]|\bLanguages\b|\bSkills\b)", before)) or bool(
            re.search(r"^\s*([,/;)|]|\bprogramming\b|\blanguage\b|\bembedded\b)", after, re.IGNORECASE)
        )
        return has_delimiter or section_name == "skills"

    if mode == "strict_r":
        if alias == "R" and matched_token != "R":
            return False
        if re.match(r"^\s*&\s*D\b", after, re.IGNORECASE):
            return False
        if alias == "RStudio":
            return True
        has_delimiter = bool(re.search(r"([,/:|(]|\bLanguages\b|\bSkills\b|\bin\s+$)", before, re.IGNORECASE)) or bool(
            re.search(r"^\s*([,/;)|]|\bprogramming\b|\bstatistics\b|\bstudio\b)", after, re.IGNORECASE)
        )
        return has_delimiter or section_name == "skills"

    if mode == "strict_go":
        if alias.lower() == "golang":
            return True
        if matched_token != "Go":
            return False
        if re.match(r"^\s+(to|for|ahead|beyond|through|into|with|on|back|live)\b", after, re.IGNORECASE):
            return False
        has_tech_context = bool(re.search(r"([,/:|(]|\bLanguages\b|\bSkills\b|\bin\s+$)", before, re.IGNORECASE)) or bool(
            re.search(r"^\s*([,/;)|]|\bbackend\b|\bmicroservices\b|\bAPIs?\b|\bservices\b)", after, re.IGNORECASE)
        )
        return has_tech_context or section_name == "skills"

    if mode == "case_token_js":
        if alias == "JS":
            return matched_token == "JS"
        return True

    if mode == "strict_upper":
        if alias in {"RAG", "IAM"}:
            return matched_token == alias
        return True

    if mode == "strict_case_title":
        if alias == "Express":
            if matched_token != "Express":
                return False
            return bool(re.search(r"(Node|React|Flask|API|[,/:|]|\bExpress\b)", window))
        return True

    return True


def extract_skills_from_sections(
    sections: Iterable[tuple[str, str]],
) -> dict[str, DetectedSkill]:
    """
    Extract canonical skills deterministically from (section_type, text) pairs.
    Matches longest aliases first with character-span occupation so 'JavaScript'
    never triggers false hits for 'Java' and 'C++'/'C#' never trigger 'C'.
    """
    taxonomy = load_skill_taxonomy()
    alias_candidates: list[tuple[str, SkillEntry]] = []
    for entry in taxonomy:
        for alias in entry.aliases:
            alias_candidates.append((alias, entry))

    alias_candidates.sort(key=lambda pair: len(pair[0]), reverse=True)

    detected: dict[str, DetectedSkill] = {}

    for section_type, text in sections:
        if not text:
            continue
        occupied_spans: list[tuple[int, int]] = []

        for alias, entry in alias_candidates:
            case_sensitive = entry.disambiguation in {"strict_c", "strict_go", "strict_upper"} and alias in {"C", "Go", "RAG", "IAM"}
            pattern = _build_boundary_regex(alias, case_sensitive=case_sensitive)

            for match in pattern.finditer(text):
                start, end = match.span()
                if any(not (end <= s or start >= e) for s, e in occupied_spans):
                    continue
                if not _passes_disambiguation(entry, alias, text, start, end, section_type):
                    continue

                occupied_spans.append((start, end))
                if entry.canonical_key not in detected:
                    detected[entry.canonical_key] = DetectedSkill(
                        canonical_key=entry.canonical_key,
                        display_name=entry.display_name,
                        category=entry.category,
                        matched_alias=text[start:end],
                        section=section_type,
                        snippet=_extract_snippet(text, start, end),
                        start=start,
                        end=end,
                    )

    return detected


def evaluate_role_skills(
    sections: Iterable[tuple[str, str]],
    role_requirements: Iterable[dict[str, object]],
) -> list[RoleMatchEvaluation]:
    """
    Compare detected resume skills against structured role requirements.
    Missing keywords explicitly clarify that absence in resume text does not
    prove a candidate lacks the skill.
    """
    taxonomy_by_key = {entry.canonical_key: entry for entry in load_skill_taxonomy()}
    detected = extract_skills_from_sections(sections)

    implied_sources: dict[str, DetectedSkill] = {}
    for key, hit in detected.items():
        entry = taxonomy_by_key.get(key)
        if not entry:
            continue
        for implied_key in entry.implies:
            if implied_key not in implied_sources:
                implied_sources[implied_key] = hit

    results: list[RoleMatchEvaluation] = []
    for req in role_requirements:
        c_key = str(req["canonical_key"])
        skill_name = str(req["skill_name"])
        category = str(req["category"])
        req_level = str(req["requirement_level"])
        priority = int(req.get("learning_priority", 3))

        if c_key in detected:
            hit = detected[c_key]
            results.append(
                RoleMatchEvaluation(
                    skill_name=skill_name,
                    canonical_key=c_key,
                    category=category,
                    requirement_level=req_level,
                    match_status="matched",
                    evidence_section=hit.section,
                    evidence_snippet=hit.snippet,
                    learning_priority=None,
                    status_note=f"Exact/alias match ('{hit.matched_alias}') detected in {hit.section}.",
                )
            )
        elif c_key in implied_sources:
            src = implied_sources[c_key]
            results.append(
                RoleMatchEvaluation(
                    skill_name=skill_name,
                    canonical_key=c_key,
                    category=category,
                    requirement_level=req_level,
                    match_status="synonym_matched",
                    evidence_section=src.section,
                    evidence_snippet=src.snippet,
                    learning_priority=priority,
                    status_note=f"Related skill '{src.display_name}' detected; verify if '{skill_name}' should be listed explicitly.",
                )
            )
        else:
            results.append(
                RoleMatchEvaluation(
                    skill_name=skill_name,
                    canonical_key=c_key,
                    category=category,
                    requirement_level=req_level,
                    match_status="missing",
                    evidence_section=None,
                    evidence_snippet=None,
                    learning_priority=priority,
                    status_note="Not detected in resume text (absence in text does not prove lack of skill).",
                )
            )

    return results
