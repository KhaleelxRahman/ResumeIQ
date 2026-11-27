import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError, type ParsedDocumentResult, type ParseWarning } from '../types.js';
import { normalizeExtractedText } from './normalizer.js';

interface TextBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
}

function groupTextItemsIntoBlocks(
  items: Array<{ str?: string; transform?: number[]; width?: number; height?: number; hasEOL?: boolean }>,
  pageHeight: number,
): TextBox[] {
  interface RawSpan {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    text: string;
  }

  const spans: RawSpan[] = [];
  for (const item of items) {
    const str = item.str ?? '';
    if (!str.trim()) continue;
    const tx = item.transform ?? [1, 0, 0, 1, 0, 0];
    const x0 = tx[4] ?? 0;
    const h = Math.max(8, Math.abs(item.height ?? tx[3] ?? 10));
    const yBottom = pageHeight - (tx[5] ?? 0);
    const y0 = yBottom - h;
    const w = Math.max(2, item.width ?? str.length * 4.5);
    spans.push({ x0, y0, x1: x0 + w, y1: yBottom, text: str });
  }

  if (spans.length === 0) return [];

  // Sort top-to-bottom, left-to-right, and cluster into visual lines/blocks.
  spans.sort((a, b) => (Math.abs(a.y0 - b.y0) <= 3 ? a.x0 - b.x0 : a.y0 - b.y0));

  const lines: RawSpan[] = [];
  for (const span of spans) {
    const prev = lines[lines.length - 1];
    if (prev && Math.abs(prev.y0 - span.y0) <= 4 && span.x0 - prev.x1 < 36) {
      const gap = span.x0 - prev.x1 > 2 ? ' ' : '';
      prev.text = `${prev.text}${gap}${span.text}`;
      prev.x1 = Math.max(prev.x1, span.x1);
      prev.y0 = Math.min(prev.y0, span.y0);
      prev.y1 = Math.max(prev.y1, span.y1);
    } else {
      lines.push({ ...span });
    }
  }

  return lines.map((l) => ({
    x0: l.x0,
    y0: l.y0,
    x1: l.x1,
    y1: l.y1,
    text: l.text.trim(),
  }));
}

function detectAndOrderPageBlocks(
  blocks: TextBox[],
  pageWidth: number,
): [string[], boolean] {
  if (blocks.length === 0) return [[], false];

  const mid = pageWidth * 0.5;
  const leftBlocks: TextBox[] = [];
  const rightBlocks: TextBox[] = [];
  const wideBlocks: TextBox[] = [];

  for (const b of blocks) {
    if (b.x1 <= mid + 18) {
      leftBlocks.push(b);
    } else if (b.x0 >= mid - 18) {
      rightBlocks.push(b);
    } else {
      wideBlocks.push(b);
    }
  }

  let hasVerticalOverlap = false;
  if (leftBlocks.length >= 2 && rightBlocks.length >= 2) {
    outer: for (const l of leftBlocks) {
      for (const r of rightBlocks) {
        if (Math.min(l.y1, r.y1) - Math.max(l.y0, r.y0) > 6) {
          hasVerticalOverlap = true;
          break outer;
        }
      }
    }
  }

  if (!hasVerticalOverlap) {
    const ordered = [...blocks].sort((a, b) => {
      const dy = Math.round(a.y0 * 10) - Math.round(b.y0 * 10);
      return dy !== 0 ? dy : Math.round(a.x0 * 10) - Math.round(b.x0 * 10);
    });
    return [ordered.map((b) => b.text), false];
  }

  const wideSorted = [...wideBlocks].sort((a, b) => a.y0 - b.y0);
  const leftSorted = [...leftBlocks].sort((a, b) => a.y0 - b.y0);
  const rightSorted = [...rightBlocks].sort((a, b) => a.y0 - b.y0);

  const firstColY = Math.min(
    ...leftSorted.map((b) => b.y0),
    ...rightSorted.map((b) => b.y0),
  );
  const topWide = wideSorted.filter((b) => b.y1 <= firstColY + 10).map((b) => b.text);
  const bottomWide = wideSorted.filter((b) => b.y1 > firstColY + 10).map((b) => b.text);

  return [
    [...topWide, ...leftSorted.map((b) => b.text), ...rightSorted.map((b) => b.text), ...bottomWide],
    true,
  ];
}

export async function parsePdfDocument(buffer: Buffer): Promise<ParsedDocumentResult> {
  let doc: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });
    doc = await loadingTask.promise;
  } catch (err: unknown) {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
    const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
    if (name === 'PasswordException' || /password/i.test(msg)) {
      throw new ApiError(
        422,
        'ENCRYPTED_DOCUMENT_UNSUPPORTED',
        'Password-protected or encrypted PDFs are not supported. Export an unprotected PDF.',
      );
    }
    throw new ApiError(
      422,
      'CORRUPTED_DOCUMENT',
      'Uploaded PDF file appears corrupted or malformed.',
    );
  }

  const pageCount = doc.numPages;
  if (pageCount <= 0) {
    await doc.destroy();
    throw new ApiError(422, 'EMPTY_DOCUMENT', 'PDF contains zero pages.');
  }

  const pageChunks: string[] = [];
  let totalImages = 0;
  let anyMultiColumn = false;

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const opList = await page.getOperatorList();

      for (const fn of opList.fnArray) {
        if (
          fn === pdfjsLib.OPS.paintImageXObject ||
          fn === pdfjsLib.OPS.paintInlineImageXObject ||
          fn === pdfjsLib.OPS.paintImageMaskXObject
        ) {
          totalImages += 1;
        }
      }

      const items = textContent.items.filter(
        (item): item is Extract<(typeof textContent.items)[number], { str: string }> =>
          'str' in item,
      );
      const blocks = groupTextItemsIntoBlocks(items, viewport.height || 792);
      const [orderedTexts, isMultiCol] = detectAndOrderPageBlocks(blocks, viewport.width || 612);
      if (isMultiCol) anyMultiColumn = true;
      if (orderedTexts.length > 0) {
        pageChunks.push(orderedTexts.join('\n'));
      }
    }
  } finally {
    await doc.destroy();
  }

  const normalized = normalizeExtractedText(pageChunks.join('\n\n'));
  const alnumChars = (normalized.match(/[a-zA-Z0-9]/g) ?? []).length;

  if (alnumChars < 60 && totalImages > 0) {
    throw new ApiError(
      422,
      'SCANNED_PDF_DETECTED',
      'This PDF appears to be a scanned image or outlined vector document with no selectable text layer (server-side OCR is not used). Export a text-selectable PDF or upload a DOCX file.',
      {
        page_count: pageCount,
        image_count: totalImages,
        extracted_chars: alnumChars,
      },
    );
  }

  if (alnumChars < 20) {
    throw new ApiError(
      422,
      'EMPTY_DOCUMENT',
      'No readable resume text could be extracted from this PDF.',
      { page_count: pageCount, extracted_chars: alnumChars },
    );
  }

  const warnings: ParseWarning[] = [];
  let penalty = 0.0;
  if (anyMultiColumn) {
    warnings.push({
      code: 'MULTI_COLUMN_LAYOUT',
      severity: 'warning',
      message:
        'Multi-column PDF layout detected. Column reading order was reconstructed heuristically; verify section order below.',
    });
    penalty += 0.12;
  }

  return {
    raw_text: normalized,
    page_count: pageCount,
    file_type: 'pdf',
    warnings,
    layout_penalty: penalty,
    table_ratio: 0,
  };
}
