from __future__ import annotations

import io
from pathlib import Path

from docx import Document
from docx.document import Document as DocxDocument
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.parsers.detector import DocumentValidationError
from app.parsers.normalizer import normalize_extracted_text
from app.parsers.pdf_parser import ParseWarning, ParsedDocumentResult


def _iter_body_items(doc: DocxDocument):
    """Yield paragraphs and tables in true top-down document body order."""
    body = doc.element.body
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, doc)
        elif isinstance(child, CT_Tbl):
            yield Table(child, doc)


def _extract_table_lines(table: Table) -> list[str]:
    lines: list[str] = []
    # Retain CT_Tc proxy references in the set directly so lxml wrapper addresses cannot be recycled mid-loop.
    seen_tcs: set[object] = set()
    for row in table.rows:
        row_cells: list[str] = []
        for cell in row.cells:
            tc = cell._tc
            if tc in seen_tcs:
                continue
            seen_tcs.add(tc)
            cell_text = " ".join(p.text.strip() for p in cell.paragraphs if p.text.strip())
            if cell_text:
                row_cells.append(cell_text)
        if row_cells:
            lines.append(" | ".join(row_cells))
    return lines


def parse_docx_document(file_path: Path) -> ParsedDocumentResult:
    """
    Extract text from DOCX paragraphs, Word tables (deduplicating merged cells),
    and document headers/footers.
    """
    raw_bytes = file_path.read_bytes()
    try:
        doc = Document(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise DocumentValidationError(
            422,
            "CORRUPTED_DOCUMENT",
            "Uploaded DOCX file appears corrupted or malformed.",
        ) from exc

    header_lines: list[str] = []
    seen_headers: set[str] = set()
    for section in doc.sections:
        for para in section.header.paragraphs:
            txt = para.text.strip()
            if txt and txt not in seen_headers:
                seen_headers.add(txt)
                header_lines.append(txt)
        for para in section.footer.paragraphs:
            txt = para.text.strip()
            if txt and txt not in seen_headers:
                seen_headers.add(txt)
                header_lines.append(txt)

    body_lines: list[str] = []
    table_words = 0
    total_body_words = 0
    table_count = 0

    for item in _iter_body_items(doc):
        if isinstance(item, Paragraph):
            txt = item.text.strip()
            if txt:
                body_lines.append(txt)
                total_body_words += len(txt.split())
        elif isinstance(item, Table):
            table_count += 1
            t_lines = _extract_table_lines(item)
            for tl in t_lines:
                body_lines.append(tl)
                wc = len(tl.split())
                table_words += wc
                total_body_words += wc

    combined_parts = []
    if header_lines:
        combined_parts.append("\n".join(header_lines))
    if body_lines:
        combined_parts.append("\n".join(body_lines))

    normalized = normalize_extracted_text("\n\n".join(combined_parts))
    alnum_chars = sum(1 for ch in normalized if ch.isalnum())

    if alnum_chars < 20:
        raise DocumentValidationError(
            422,
            "EMPTY_DOCUMENT",
            "No readable resume text could be extracted from this DOCX document.",
            {"extracted_chars": alnum_chars},
        )

    warnings: list[ParseWarning] = []
    penalty = 0.0
    table_ratio = (table_words / total_body_words) if total_body_words > 0 else 0.0

    if table_count > 0 and (table_ratio > 0.25 or table_words >= 20):
        warnings.append(
            ParseWarning(
                code="TABLE_LAYOUT_DETECTED",
                severity="warning",
                message="Word table layout detected. Some legacy ATS parsers scramble table cells; verify extracted sections below.",
            )
        )
        penalty += 0.08

    if header_lines and ("@" in "\n".join(header_lines) or any(ch.isdigit() for ch in "\n".join(header_lines))):
        warnings.append(
            ParseWarning(
                code="HEADER_FOOTER_CONTACT_ONLY",
                severity="info",
                message="Contact text was found inside DOCX headers/footers. Consider moving contact lines into the main document body for stricter ATS compatibility.",
            )
        )
        penalty += 0.04

    return ParsedDocumentResult(
        raw_text=normalized,
        page_count=max(1, len(doc.sections)),
        file_type="docx",
        warnings=warnings,
        layout_penalty=penalty,
        table_ratio=round(table_ratio, 3),
    )
