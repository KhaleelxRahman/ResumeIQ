from __future__ import annotations

import io
import re
from dataclasses import dataclass
from typing import Literal
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


TemplateSlug = Literal["swiss-technical", "academic-editorial"]

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_BULLET_PREFIX_RE = re.compile(r"^[\-\*\u2022\u25aa\u25cf]\s+")


@dataclass(frozen=True, slots=True)
class PdfSectionInput:
    section_type: str
    raw_heading: str
    content_text: str


@dataclass(frozen=True, slots=True)
class BuilderPdfInput:
    title: str
    candidate_label: str | None
    template_slug: TemplateSlug
    contact_lines: tuple[str, ...]
    sections: tuple[PdfSectionInput, ...]


def _clean_text(value: str) -> str:
    return _CONTROL_CHARS_RE.sub("", value or "").strip()


def _safe_para_html(text: str) -> str:
    return escape(_clean_text(text))


def _canonical_heading(section: PdfSectionInput) -> str:
    heading = _clean_text(section.raw_heading).rstrip(":").strip()
    if not heading or heading.upper() == "HEADER":
        fallback = section.section_type.replace("_", " ").strip().upper()
        return fallback or "SECTION"
    return heading.upper()


def _render_section_paragraphs(content_text: str, body_style: ParagraphStyle, bullet_style: ParagraphStyle) -> list:
    flowables: list = []
    blocks = [blk.strip() for blk in re.split(r"\n{2,}", content_text or "") if blk.strip()]
    for b_idx, block in enumerate(blocks):
        for raw_line in block.splitlines():
            line = _clean_text(raw_line)
            if not line:
                continue
            if _BULLET_PREFIX_RE.match(line):
                normalized_bullet = _BULLET_PREFIX_RE.sub("- ", line, count=1)
                flowables.append(Paragraph(_safe_para_html(normalized_bullet), bullet_style))
            else:
                flowables.append(Paragraph(_safe_para_html(line), body_style))
        if b_idx < len(blocks) - 1:
            flowables.append(Spacer(1, 3))
    return flowables


def render_resume_pdf(payload: BuilderPdfInput) -> bytes:
    """
    Render a single-column, linear, ATS-safe resume PDF using ReportLab.
    Produces full-width flowables with selectable text so PyMuPDF extracts
    sections linearly without multi-column jitter or text-free image gaps.
    """
    is_academic = payload.template_slug == "academic-editorial"
    base_font = "Times-Roman" if is_academic else "Helvetica"
    bold_font = "Times-Bold" if is_academic else "Helvetica-Bold"
    ink = colors.HexColor("#111827")
    muted = colors.HexColor("#4B5563")
    rule_color = colors.HexColor("#9CA3AF") if is_academic else colors.HexColor("#D1D5DB")

    name_style = ParagraphStyle(
        "CandidateName",
        fontName=bold_font,
        fontSize=18 if is_academic else 19,
        leading=22,
        textColor=ink,
        alignment=TA_CENTER if is_academic else TA_LEFT,
        spaceAfter=2,
    )
    contact_style = ParagraphStyle(
        "ContactLine",
        fontName=base_font,
        fontSize=9.5,
        leading=13,
        textColor=muted,
        alignment=TA_CENTER if is_academic else TA_LEFT,
        spaceAfter=2,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        fontName=bold_font,
        fontSize=10.5,
        leading=14,
        textColor=ink,
        spaceBefore=9,
        spaceAfter=2,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        "SectionBody",
        fontName=base_font,
        fontSize=10,
        leading=13.5,
        textColor=ink,
        spaceAfter=2,
    )
    bullet_style = ParagraphStyle(
        "SectionBullet",
        parent=body_style,
        leftIndent=10,
        firstLineIndent=0,
        spaceAfter=1.5,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=48,
        rightMargin=48,
        topMargin=42,
        bottomMargin=42,
        title=_clean_text(payload.title) or "ResumeIQ Resume",
        author="ResumeIQ Student Builder",
        subject="ATS-Safe Resume Export",
    )

    story: list = []
    candidate_display = _clean_text(payload.candidate_label or "") or _clean_text(payload.title) or "Candidate Resume"
    masthead_name = candidate_display.upper() if is_academic else candidate_display

    header_flowables: list = [Paragraph(_safe_para_html(masthead_name), name_style)]
    for c_line in payload.contact_lines:
        cleaned = _clean_text(c_line)
        if cleaned:
            header_flowables.append(Paragraph(_safe_para_html(cleaned), contact_style))

    if is_academic:
        story.extend(header_flowables)
        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="100%", thickness=1.5, color=ink, spaceBefore=0, spaceAfter=6))
    else:
        # Single full-width table cell preserves strict single-column linear extraction in PyMuPDF.
        accent_header = Table([[header_flowables]], colWidths=[doc.width])
        accent_header.setStyle(
            TableStyle(
                [
                    ("LINEBEFORE", (0, 0), (0, -1), 3.0, ink),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        story.append(accent_header)
        story.append(Spacer(1, 6))

    for sec in payload.sections:
        if sec.section_type == "header_contact":
            continue
        body_text = _clean_text(sec.content_text)
        if not body_text:
            continue

        heading_text = _canonical_heading(sec)
        story.append(Paragraph(_safe_para_html(heading_text), heading_style))
        story.append(
            HRFlowable(
                width="100%",
                thickness=0.85,
                color=ink if is_academic else rule_color,
                spaceBefore=0,
                spaceAfter=4,
            )
        )
        story.extend(_render_section_paragraphs(body_text, body_style=body_style, bullet_style=bullet_style))

    doc.build(story)
    return buffer.getvalue()
