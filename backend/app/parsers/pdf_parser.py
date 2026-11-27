from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pymupdf as fitz

from app.parsers.detector import DocumentValidationError
from app.parsers.normalizer import normalize_extracted_text


@dataclass(frozen=True, slots=True)
class ParseWarning:
    code: str
    severity: str  # info | warning | error
    message: str


@dataclass(frozen=True, slots=True)
class ParsedDocumentResult:
    raw_text: str
    page_count: int
    file_type: str
    warnings: list[ParseWarning] = field(default_factory=list)
    layout_penalty: float = 0.0
    table_ratio: float = 0.0


def _detect_and_order_page_blocks(
    blocks: list[tuple[float, float, float, float, str, int, int]],
    page_width: float,
) -> tuple[list[str], bool]:
    """
    Order PyMuPDF text blocks top-to-bottom. Detect multi-column layouts when
    left-side and right-side blocks share vertical bands across the page midline.
    """
    text_blocks = [
        b for b in blocks if len(b) >= 7 and b[6] == 0 and (b[4] or "").strip()
    ]
    if not text_blocks:
        return [], False

    mid = page_width * 0.5
    left_blocks: list[tuple[float, float, float, float, str]] = []
    right_blocks: list[tuple[float, float, float, float, str]] = []
    wide_blocks: list[tuple[float, float, float, float, str]] = []

    for x0, y0, x1, y1, text, *_ in text_blocks:
        if x1 <= mid + 18.0:
            left_blocks.append((x0, y0, x1, y1, text))
        elif x0 >= mid - 18.0:
            right_blocks.append((x0, y0, x1, y1, text))
        else:
            wide_blocks.append((x0, y0, x1, y1, text))

    # Multi-column heuristic: both left and right column blocks exist and overlap vertically.
    has_vertical_overlap = False
    if len(left_blocks) >= 2 and len(right_blocks) >= 2:
        for _, ly0, _, ly1, _ in left_blocks:
            for _, ry0, _, ry1, _ in right_blocks:
                if min(ly1, ry1) - max(ly0, ry0) > 6.0:
                    has_vertical_overlap = True
                    break
            if has_vertical_overlap:
                break

    if not has_vertical_overlap:
        ordered = sorted(text_blocks, key=lambda b: (round(b[1], 1), round(b[0], 1)))
        return [b[4].strip() for b in ordered], False

    wide_sorted = sorted(wide_blocks, key=lambda b: b[1])
    left_sorted = sorted(left_blocks, key=lambda b: b[1])
    right_sorted = sorted(right_blocks, key=lambda b: b[1])

    # Place top wide headers first, then left column, then right column, then bottom wide blocks.
    first_col_y = min(
        [b[1] for b in left_sorted] + [b[1] for b in right_sorted],
        default=float("inf"),
    )
    top_wide = [b[4].strip() for b in wide_sorted if b[3] <= first_col_y + 10.0]
    bottom_wide = [b[4].strip() for b in wide_sorted if b[3] > first_col_y + 10.0]

    ordered_texts = (
        top_wide
        + [b[4].strip() for b in left_sorted]
        + [b[4].strip() for b in right_sorted]
        + bottom_wide
    )
    return ordered_texts, True


def parse_pdf_document(file_path: Path) -> ParsedDocumentResult:
    """
    Extract text from PDF via PyMuPDF with coordinate-aware ordering,
    encryption checks, and image-only scanned PDF detection.
    """
    raw_bytes = file_path.read_bytes()
    try:
        doc = fitz.open(stream=raw_bytes, filetype="pdf")
    except Exception as exc:
        raise DocumentValidationError(
            422,
            "CORRUPTED_DOCUMENT",
            "Uploaded PDF file appears corrupted or malformed.",
        ) from exc

    try:
        if doc.is_encrypted or doc.needs_pass:
            raise DocumentValidationError(
                422,
                "ENCRYPTED_DOCUMENT_UNSUPPORTED",
                "Password-protected or encrypted PDFs are not supported. Export an unprotected PDF.",
            )

        page_count = doc.page_count
        if page_count <= 0:
            raise DocumentValidationError(422, "EMPTY_DOCUMENT", "PDF contains zero pages.")

        page_chunks: list[str] = []
        total_images = 0
        total_drawings = 0
        any_multi_column = False

        for page in doc:
            images = page.get_images(full=True)
            total_images += len(images)
            total_drawings += len(page.get_drawings())
            blocks = page.get_text("blocks")
            ordered_texts, is_multi_col = _detect_and_order_page_blocks(
                blocks, page_width=float(page.rect.width or 612.0)
            )
            if is_multi_col:
                any_multi_column = True
            if ordered_texts:
                page_chunks.append("\n".join(ordered_texts))
    finally:
        doc.close()

    normalized = normalize_extracted_text("\n\n".join(page_chunks))
    alnum_chars = sum(1 for ch in normalized if ch.isalnum())

    if alnum_chars < 60 and (total_images > 0 or total_drawings >= 15):
        raise DocumentValidationError(
            422,
            "SCANNED_PDF_DETECTED",
            "This PDF appears to be a scanned image or outlined vector document with no selectable text layer (server-side OCR is not used). Export a text-selectable PDF or upload a DOCX file.",
            {
                "page_count": page_count,
                "image_count": total_images,
                "vector_drawings": total_drawings,
                "extracted_chars": alnum_chars,
            },
        )

    if alnum_chars < 20:
        raise DocumentValidationError(
            422,
            "EMPTY_DOCUMENT",
            "No readable resume text could be extracted from this PDF.",
            {"page_count": page_count, "extracted_chars": alnum_chars},
        )

    warnings: list[ParseWarning] = []
    penalty = 0.0
    if any_multi_column:
        warnings.append(
            ParseWarning(
                code="MULTI_COLUMN_LAYOUT",
                severity="warning",
                message="Multi-column PDF layout detected. Column reading order was reconstructed heuristically; verify section order below.",
            )
        )
        penalty += 0.12

    return ParsedDocumentResult(
        raw_text=normalized,
        page_count=page_count,
        file_type="pdf",
        warnings=warnings,
        layout_penalty=penalty,
    )
