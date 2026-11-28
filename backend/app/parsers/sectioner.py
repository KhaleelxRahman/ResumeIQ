from __future__ import annotations

import re
from dataclasses import dataclass


_SECTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("summary", re.compile(r"^(?:professional\s+summary|career\s+summary|summary|profile|career\s+objective|objective|about\s+me)$", re.I)),
    ("education", re.compile(r"^(?:education|academic\s+background|academic\s+details|qualifications|academics)$", re.I)),
    ("skills", re.compile(r"^(?:technical\s+skills|core\s+competencies|skills|key\s+skills|tech\s+stack|technologies|tools\s*(?:&|and)\s*technologies)$", re.I)),
    ("projects", re.compile(r"^(?:academic\s+projects|personal\s+projects|technical\s+projects|key\s+projects|projects)$", re.I)),
    ("internships", re.compile(r"^(?:internships?|industrial\s+training|internship\s+experience|summer\s+training)$", re.I)),
    ("experience", re.compile(r"^(?:work\s+experience|professional\s+experience|experience|employment\s+history|work\s+history)$", re.I)),
    ("certifications", re.compile(r"^(?:certifications?|licenses?\s*(?:&|and)\s*certifications?|courses?\s*(?:&|and)\s*certifications?|certificates?)$", re.I)),
    ("achievements", re.compile(r"^(?:achievements?|awards?|honors?|accomplishments?|extracurriculars?|leadership)$", re.I)),
    ("languages", re.compile(r"^(?:languages?|spoken\s+languages?)$", re.I)),
]

_LEADING_NUM_RE = re.compile(r"^(?:\d{1,2}[\.\)]\s*)")


@dataclass(frozen=True, slots=True)
class SegmentedSection:
    section_type: str
    raw_heading: str
    content_text: str
    confidence: float
    order_index: int


def _match_heading(line: str) -> tuple[str, str] | None:
    candidate = _LEADING_NUM_RE.sub("", line.strip()).rstrip(":").strip()
    if not candidate or len(candidate) > 55 or len(candidate.split()) > 5:
        return None
    for sec_type, pattern in _SECTION_PATTERNS:
        if pattern.match(candidate):
            return sec_type, line.strip().rstrip(":").strip()
    return None


def segment_resume_sections(raw_text: str) -> list[SegmentedSection]:
    """
    Split normalized resume text into canonical sections while preserving raw
    source headings and top-of-page header lines.
    """
    lines = raw_text.split("\n")
    sections: list[SegmentedSection] = []

    current_type = "header_contact"
    current_heading = "HEADER"
    buffer: list[str] = []
    order = 0

    def _flush() -> None:
        nonlocal order
        text = "\n".join(buffer).strip()
        if not text:
            return
        conf = 0.95 if current_type != "other" else 0.70
        sections.append(
            SegmentedSection(
                section_type=current_type,
                raw_heading=current_heading,
                content_text=text,
                confidence=conf,
                order_index=order,
            )
        )
        order += 1

    for line in lines:
        heading_hit = _match_heading(line)
        if heading_hit is not None:
            _flush()
            buffer = []
            current_type, current_heading = heading_hit
        else:
            buffer.append(line)

    _flush()
    return sections
