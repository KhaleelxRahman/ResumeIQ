import JSZip from 'jszip';
import { ApiError, type ParsedDocumentResult, type ParseWarning } from '../types.js';
import { normalizeExtractedText } from './normalizer.js';

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractParagraphText(pXml: string): string {
  const withBreaks = pXml
    .replace(/<w:tab\b[^>]*\/>/g, ' ')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n');
  const texts: string[] = [];
  const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRegex.exec(withBreaks)) !== null) {
    texts.push(decodeXmlEntities(m[1]));
  }
  return texts.join('').trim();
}

function extractAllParagraphsFromXml(xml: string): string[] {
  const results: string[] = [];
  const pRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(xml)) !== null) {
    const txt = extractParagraphText(m[0]);
    if (txt) results.push(txt);
  }
  return results;
}

function extractTableLines(tblXml: string): string[] {
  const lines: string[] = [];
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tblXml)) !== null) {
    const rowCells: string[] = [];
    const cellRegex = /<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[0])) !== null) {
      const paras = extractAllParagraphsFromXml(cellMatch[0]);
      const cellText = paras.join(' ').trim();
      if (cellText) rowCells.push(cellText);
    }
    if (rowCells.length > 0) {
      lines.push(rowCells.join(' | '));
    }
  }
  return lines;
}

export async function parseDocxDocument(zip: JSZip): Promise<ParsedDocumentResult> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new ApiError(
      422,
      'CORRUPTED_DOCUMENT',
      'Uploaded DOCX file appears corrupted or malformed.',
    );
  }

  let docXml: string;
  try {
    docXml = await docFile.async('string');
  } catch {
    throw new ApiError(
      422,
      'CORRUPTED_DOCUMENT',
      'Uploaded DOCX file appears corrupted or malformed.',
    );
  }

  // Extract headers and footers
  const headerLines: string[] = [];
  const seenHeaders = new Set<string>();
  const hfNames = Object.keys(zip.files)
    .filter((name) => /^word\/(?:header|footer)\d*\.xml$/i.test(name))
    .sort();

  for (const hfName of hfNames) {
    try {
      const hfXml = await zip.files[hfName].async('string');
      for (const txt of extractAllParagraphsFromXml(hfXml)) {
        if (!seenHeaders.has(txt)) {
          seenHeaders.add(txt);
          headerLines.push(txt);
        }
      }
    } catch {
      // Ignore non-critical header/footer parse errors
    }
  }

  // Extract body paragraphs and tables in document order
  const bodyMatch = docXml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/);
  const bodyContent = bodyMatch ? bodyMatch[1] : docXml;

  const bodyLines: string[] = [];
  let tableWords = 0;
  let totalBodyWords = 0;
  let tableCount = 0;

  // Walk top-level <w:p> and <w:tbl> elements cleanly by scanning tags
  const blockRegex = /(<w:tbl\b[\s\S]*?<\/w:tbl>)|(<w:p\b[\s\S]*?<\/w:p>)/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(bodyContent)) !== null) {
    if (blockMatch[1]) {
      tableCount += 1;
      const tLines = extractTableLines(blockMatch[1]);
      for (const tl of tLines) {
        bodyLines.push(tl);
        const wc = tl.split(/\s+/).filter(Boolean).length;
        tableWords += wc;
        totalBodyWords += wc;
      }
    } else if (blockMatch[2]) {
      const txt = extractParagraphText(blockMatch[2]);
      if (txt) {
        bodyLines.push(txt);
        totalBodyWords += txt.split(/\s+/).filter(Boolean).length;
      }
    }
  }

  const combinedParts: string[] = [];
  if (headerLines.length > 0) combinedParts.push(headerLines.join('\n'));
  if (bodyLines.length > 0) combinedParts.push(bodyLines.join('\n'));

  const normalized = normalizeExtractedText(combinedParts.join('\n\n'));
  const alnumChars = (normalized.match(/[a-zA-Z0-9]/g) ?? []).length;

  if (alnumChars < 20) {
    throw new ApiError(
      422,
      'EMPTY_DOCUMENT',
      'No readable resume text could be extracted from this DOCX document.',
      { extracted_chars: alnumChars },
    );
  }

  const warnings: ParseWarning[] = [];
  let penalty = 0.0;
  const tableRatio = totalBodyWords > 0 ? tableWords / totalBodyWords : 0.0;

  if (tableCount > 0 && (tableRatio > 0.25 || tableWords >= 20)) {
    warnings.push({
      code: 'TABLE_LAYOUT_DETECTED',
      severity: 'warning',
      message:
        'Word table layout detected. Some legacy ATS parsers scramble table cells; verify extracted sections below.',
    });
    penalty += 0.08;
  }

  const headerBlob = headerLines.join('\n');
  if (headerLines.length > 0 && (headerBlob.includes('@') || /\d/.test(headerBlob))) {
    warnings.push({
      code: 'HEADER_FOOTER_CONTACT_ONLY',
      severity: 'info',
      message:
        'Contact text was found inside DOCX headers/footers. Consider moving contact lines into the main document body for stricter ATS compatibility.',
    });
    penalty += 0.04;
  }

  const sectPrCount = (bodyContent.match(/<w:sectPr\b/g) ?? []).length;

  return {
    raw_text: normalized,
    page_count: Math.max(1, sectPrCount),
    file_type: 'docx',
    warnings,
    layout_penalty: penalty,
    table_ratio: Math.round(tableRatio * 1000) / 1000,
  };
}
