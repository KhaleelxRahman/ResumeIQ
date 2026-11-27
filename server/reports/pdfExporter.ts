import PDFDocument from 'pdfkit';
import type { TemplateSlug } from '../types.js';

export interface PdfSectionInput {
  section_type: string;
  raw_heading: string;
  content_text: string;
}

export interface BuilderPdfInput {
  title: string;
  candidate_label: string | null;
  template_slug: TemplateSlug;
  contact_lines: string[];
  sections: PdfSectionInput[];
}

const CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
const BULLET_PREFIX_RE = /^[-*\u2022\u25aa\u25cf]\s+/;

function cleanText(value: string): string {
  return (value || '').replace(CONTROL_CHARS_RE, '').trim();
}

function canonicalHeading(sec: PdfSectionInput): string {
  const heading = cleanText(sec.raw_heading).replace(/:+$/, '').trim();
  if (!heading || heading.toUpperCase() === 'HEADER') {
    return sec.section_type.replace(/_/g, ' ').trim().toUpperCase() || 'SECTION';
  }
  return heading.toUpperCase();
}

export function renderResumePdf(payload: BuilderPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const isAcademic = payload.template_slug === 'academic-editorial';
    const baseFont = isAcademic ? 'Times-Roman' : 'Helvetica';
    const boldFont = isAcademic ? 'Times-Bold' : 'Helvetica-Bold';
    const ink = '#111827';
    const muted = '#4B5563';
    const ruleColor = isAcademic ? '#9CA3AF' : '#D1D5DB';

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 42, bottom: 42, left: 48, right: 48 },
      info: {
        Title: cleanText(payload.title) || 'ResumeIQ Resume',
        Author: 'ResumeIQ Student Builder',
        Subject: 'ATS-Safe Resume Export',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const candidateDisplay =
      cleanText(payload.candidate_label ?? '') || cleanText(payload.title) || 'Candidate Resume';
    const mastheadName = isAcademic ? candidateDisplay.toUpperCase() : candidateDisplay;

    if (isAcademic) {
      doc
        .font(boldFont)
        .fontSize(18)
        .fillColor(ink)
        .text(mastheadName, { align: 'center' });

      for (const cLine of payload.contact_lines) {
        const cleaned = cleanText(cLine);
        if (cleaned) {
          doc
            .font(baseFont)
            .fontSize(9.5)
            .fillColor(muted)
            .text(cleaned, { align: 'center' });
        }
      }

      doc.moveDown(0.35);
      const y = doc.y;
      doc
        .strokeColor(ink)
        .lineWidth(1.5)
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.margins.left + contentWidth, y)
        .stroke();
      doc.moveDown(0.5);
    } else {
      const startY = doc.y;
      doc
        .font(boldFont)
        .fontSize(19)
        .fillColor(ink)
        .text(mastheadName, doc.page.margins.left + 10, startY, {
          width: contentWidth - 10,
          align: 'left',
        });

      for (const cLine of payload.contact_lines) {
        const cleaned = cleanText(cLine);
        if (cleaned) {
          doc
            .font(baseFont)
            .fontSize(9.5)
            .fillColor(muted)
            .text(cleaned, doc.page.margins.left + 10, doc.y, {
              width: contentWidth - 10,
              align: 'left',
            });
        }
      }

      const endY = doc.y;
      doc
        .strokeColor(ink)
        .lineWidth(3)
        .moveTo(doc.page.margins.left, startY)
        .lineTo(doc.page.margins.left, endY)
        .stroke();

      doc.x = doc.page.margins.left;
      doc.moveDown(0.6);
    }

    for (const sec of payload.sections) {
      if (sec.section_type === 'header_contact') continue;
      const bodyText = cleanText(sec.content_text);
      if (!bodyText) continue;

      const headingText = canonicalHeading(sec);
      doc
        .font(boldFont)
        .fontSize(10.5)
        .fillColor(ink)
        .text(headingText, doc.page.margins.left, doc.y, { width: contentWidth });

      const ruleY = doc.y + 1;
      doc
        .strokeColor(isAcademic ? ink : ruleColor)
        .lineWidth(0.85)
        .moveTo(doc.page.margins.left, ruleY)
        .lineTo(doc.page.margins.left + contentWidth, ruleY)
        .stroke();

      doc.y = ruleY + 5;

      const blocks = bodyText
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean);

      blocks.forEach((block, bIdx) => {
        for (const rawLine of block.split('\n')) {
          const line = cleanText(rawLine);
          if (!line) continue;
          if (BULLET_PREFIX_RE.test(line)) {
            const normalizedBullet = line.replace(BULLET_PREFIX_RE, '- ');
            doc
              .font(baseFont)
              .fontSize(10)
              .fillColor(ink)
              .text(normalizedBullet, doc.page.margins.left + 10, doc.y, {
                width: contentWidth - 10,
              });
          } else {
            doc
              .font(baseFont)
              .fontSize(10)
              .fillColor(ink)
              .text(line, doc.page.margins.left, doc.y, {
                width: contentWidth,
              });
          }
        }
        if (bIdx < blocks.length - 1) {
          doc.moveDown(0.25);
        }
      });

      doc.moveDown(0.45);
    }

    doc.end();
  });
}
