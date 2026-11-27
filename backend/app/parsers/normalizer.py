from __future__ import annotations

import re
import unicodedata


_BULLET_PREFIX_RE = re.compile(r"^[\u2022\u25aa\u25cf\u2023\u25e6\u2043\u2219\*\u2013\u2014]\s*")
_HYPHEN_WRAP_RE = re.compile(r"([A-Za-z]{2,})-\n([a-z]{2,})")
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")


def normalize_extracted_text(raw: str) -> str:
    """
    Normalize extracted document text without inventing content:
    - Unicode NFKC normalization & null-byte stripping
    - Smart quotes / dashes standardization
    - Soft line-break hyphen repair (e.g., 'develop-\\nment' -> 'development')
    - Clean bullet & whitespace formatting preserving section line structure
    """
    if not raw:
        return ""

    text = unicodedata.normalize("NFKC", raw)
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = _HYPHEN_WRAP_RE.sub(r"\1\2", text)

    cleaned_lines: list[str] = []
    blank_streak = 0

    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            blank_streak += 1
            if blank_streak <= 1 and cleaned_lines:
                cleaned_lines.append("")
            continue

        blank_streak = 0
        stripped = _BULLET_PREFIX_RE.sub("- ", stripped)
        stripped = _MULTI_SPACE_RE.sub(" ", stripped)
        cleaned_lines.append(stripped)

    while cleaned_lines and cleaned_lines[-1] == "":
        cleaned_lines.pop()

    return "\n".join(cleaned_lines)
