from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable
from urllib.parse import urlparse

from app.nlp.skill_matcher import extract_skills_from_sections
from app.parsers.pdf_parser import ParseWarning
from app.parsers.sectioner import SegmentedSection


_EMAIL_RE = re.compile(r"\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\d{5}[\s.-]?\d{5}|\d{10})(?!\d)"
)
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_-]+/?", re.I)
_GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_.-]+/?", re.I)
_URL_RE = re.compile(r"https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s|,;]*", re.I)

_NON_NAME_HEADINGS = {
    "resume",
    "curriculum vitae",
    "cv",
    "profile",
    "bio",
    "contact",
    "summary",
}


def _mask_email(email: str) -> str:
    local, domain = email.split("@", 1)
    prefix = local[0] if local else "*"
    return f"{prefix}***@{domain}"


def _mask_phone(phone: str) -> str:
    digits = [ch for ch in phone if ch.isdigit()]
    if len(digits) < 6:
        return "***"
    return f"***-***-{''.join(digits[-4:])}"


def _mask_handle(value: str) -> str:
    clean = value.strip()
    if len(clean) <= 1:
        return "***"
    return f"{clean[0]}***"


def _mask_linkedin(url: str) -> str:
    match = re.search(r"linkedin\.com/in/([^/?#\s]+)", url, re.I)
    slug = match.group(1) if match else ""
    return f"linkedin.com/in/{_mask_handle(slug)}"


def _mask_github(url: str) -> str:
    match = re.search(r"github\.com/([^/?#\s]+)", url, re.I)
    username = match.group(1) if match else ""
    return f"github.com/{_mask_handle(username)}"


def _mask_portfolio(url: str) -> str:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.hostname or "").lower().removeprefix("www.")
    if not host:
        return "[portfolio redacted]"
    labels = host.split(".")
    if len(labels) >= 2:
        masked_host = ".".join([_mask_handle(lbl) for lbl in labels[:-1]] + [labels[-1]])
    else:
        masked_host = _mask_handle(host)
    has_subpath = bool((parsed.path and parsed.path != "/") or parsed.query)
    return f"{masked_host}/***" if has_subpath else masked_host


def compose_sections_text(sections: Iterable[SegmentedSection]) -> str:
    """Reconstruct normalized linear text from ordered resume sections."""
    blocks: list[str] = []
    for sec in sections:
        heading = sec.raw_heading.strip()
        body = sec.content_text.strip()
        if sec.section_type != "header_contact" and heading and heading.upper() != "HEADER":
            blocks.append(f"{heading}\n{body}" if body else heading)
        elif body:
            blocks.append(body)
    return "\n\n".join(blocks)


def _infer_candidate_label(sections: list[SegmentedSection], raw_text: str) -> str | None:
    header_text = next((s.content_text for s in sections if s.section_type == "header_contact"), raw_text)
    for raw_line in header_text.split("\n")[:6]:
        line = raw_line.split("|")[0].strip()
        if not line or len(line) < 3 or len(line) > 55:
            continue
        lower = line.lower()
        if lower in _NON_NAME_HEADINGS:
            continue
        if _EMAIL_RE.search(line) or _PHONE_RE.search(line) or "http" in lower or "github.com" in lower or "linkedin.com" in lower:
            continue
        if any(ch.isdigit() for ch in line):
            continue
        words = line.split()
        if 1 <= len(words) <= 4 and all(any(c.isalpha() for c in w) for w in words):
            return line
    return None


def _split_entries(text: str) -> list[str]:
    if not text.strip():
        return []
    blocks = [b.strip() for b in re.split(r"\n{2,}", text.strip()) if b.strip()]
    if len(blocks) > 1:
        return blocks
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    return lines


@dataclass(slots=True)
class ExtractedResumeBundle:
    candidate_label: str | None
    contact_flags: dict[str, bool]
    masked_contact: dict[str, str | None]
    structured_payload: dict[str, object]
    extraction_confidence: float
    warnings: list[ParseWarning] = field(default_factory=list)


def extract_structured_resume_entities(
    raw_text: str,
    sections: list[SegmentedSection],
    base_warnings: list[ParseWarning],
    layout_penalty: float = 0.0,
) -> ExtractedResumeBundle:
    """
    Extract conservative, evidence-grounded resume fields without inventing
    missing facts, skills, dates, or achievements.
    """
    warnings = list(base_warnings)
    top_slice = "\n".join(raw_text.split("\n")[:15])
    search_space = top_slice + "\n" + raw_text

    email_match = _EMAIL_RE.search(search_space)
    phone_match = _PHONE_RE.search(search_space)
    linkedin_match = _LINKEDIN_RE.search(search_space)
    github_match = _GITHUB_RE.search(search_space)

    portfolio_url: str | None = None
    for url_hit in _URL_RE.finditer(search_space):
        url_str = url_hit.group(0)
        if "linkedin.com" in url_str.lower() or "github.com" in url_str.lower():
            continue
        portfolio_url = url_str
        break

    contact_flags = {
        "has_email": email_match is not None,
        "has_phone": phone_match is not None,
        "has_linkedin": linkedin_match is not None,
        "has_github": github_match is not None,
        "has_portfolio": portfolio_url is not None,
    }
    masked_contact = {
        "email": _mask_email(email_match.group(0)) if email_match else None,
        "phone": _mask_phone(phone_match.group(0)) if phone_match else None,
        "linkedin": _mask_linkedin(linkedin_match.group(0)) if linkedin_match else None,
        "github": _mask_github(github_match.group(0)) if github_match else None,
        "portfolio": _mask_portfolio(portfolio_url) if portfolio_url else None,
    }

    candidate_label = _infer_candidate_label(sections, raw_text)

    by_type: dict[str, list[str]] = {}
    for sec in sections:
        by_type.setdefault(sec.section_type, []).append(sec.content_text)

    detected_skills = extract_skills_from_sections([(s.section_type, s.content_text) for s in sections])
    skill_list = sorted({hit.display_name for hit in detected_skills.values()})

    summary_text = "\n\n".join(by_type.get("summary", [])) or None
    education_entries = _split_entries("\n\n".join(by_type.get("education", [])))
    project_entries = _split_entries("\n\n".join(by_type.get("projects", [])))
    experience_entries = _split_entries("\n\n".join(by_type.get("experience", [])))
    internship_entries = _split_entries("\n\n".join(by_type.get("internships", [])))
    certification_entries = _split_entries("\n\n".join(by_type.get("certifications", [])))
    achievement_entries = _split_entries("\n\n".join(by_type.get("achievements", [])))
    language_entries = _split_entries("\n\n".join(by_type.get("languages", [])))

    recognized_section_types = {
        s.section_type for s in sections if s.section_type not in {"header_contact", "other"}
    }
    word_count = len(raw_text.split())

    confidence = 1.0 - layout_penalty
    if len(recognized_section_types) < 2:
        confidence -= 0.20
        warnings.append(
            ParseWarning(
                code="MISSING_STANDARD_SECTIONS",
                severity="warning",
                message="Fewer than two standard resume headings were detected. Review and verify section blocks below.",
            )
        )
    if not contact_flags["has_email"] and not contact_flags["has_phone"]:
        confidence -= 0.10
        warnings.append(
            ParseWarning(
                code="MISSING_CONTACT_INFO",
                severity="info",
                message="Neither email nor phone number was detected in the extracted text.",
            )
        )
    if word_count < 80:
        confidence -= 0.25
        warnings.append(
            ParseWarning(
                code="LOW_WORD_COUNT",
                severity="warning",
                message=f"Only {word_count} words were extracted; verify whether any pages or blocks were missed.",
            )
        )

    confidence = round(max(0.15, min(1.0, confidence)), 2)

    structured_payload = {
        "candidate_label": candidate_label,
        "summary": summary_text,
        "education": education_entries,
        "skills": skill_list,
        "projects": project_entries,
        "experience": experience_entries,
        "internships": internship_entries,
        "certifications": certification_entries,
        "achievements": achievement_entries,
        "languages": language_entries,
    }

    return ExtractedResumeBundle(
        candidate_label=candidate_label,
        contact_flags=contact_flags,
        masked_contact=masked_contact,
        structured_payload=structured_payload,
        extraction_confidence=confidence,
        warnings=warnings,
    )
