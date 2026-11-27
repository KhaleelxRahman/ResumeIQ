import { Printer } from 'lucide-react';
import {
  serializeSectionToContentText,
  type BuilderDocumentState,
} from './builderModel';

interface ResumePaperPreviewProps {
  document: BuilderDocumentState;
}

const BULLET_RE = /^[-*\u2022]\s+/;

export function ResumePaperPreview({ document: doc }: ResumePaperPreviewProps) {
  const isAcademic = doc.templateSlug === 'academic-editorial';
  const contactItems = [
    doc.contact.email,
    doc.contact.phone,
    doc.contact.location,
    doc.contact.linkedin,
    doc.contact.github,
    doc.contact.portfolio,
  ]
    .map((v) => v.trim())
    .filter(Boolean);

  const renderedSections = doc.sections
    .map((sec) => ({
      id: sec.id,
      heading: sec.heading.trim() || sec.type.toUpperCase(),
      content: serializeSectionToContentText(sec),
    }))
    .filter((s) => Boolean(s.content));

  const displayName = doc.contact.full_name.trim() || 'Your Name';

  return (
    <section aria-label="Live Resume Document Preview" className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono-tabular text-xs text-[var(--text-secondary)]">
          <span>LIVE DOCUMENT PREVIEW</span>
          <span aria-hidden="true">•</span>
          <span className="text-[var(--text-primary)]">
            {isAcademic ? 'Academic Editorial' : 'Swiss Technical'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
        >
          <Printer size={14} aria-hidden="true" />
          <span>Print View</span>
        </button>
      </div>

      {/* Print-friendly paper sheet — strictly clean document typography, zero app chrome inside */}
      <article
        data-testid="resume-paper-preview"
        data-template={doc.templateSlug}
        className={`resume-paper-sheet min-h-[760px] rounded-md border border-[var(--border-hairline)] bg-white p-8 text-[13px] leading-[1.45] text-[#1f2421] shadow-lg sm:p-10 ${
          isAcademic ? 'font-serif' : 'font-sans'
        }`}
      >
        {isAcademic ? (
          <header className="mb-5 border-b-2 border-[#1f2421] pb-3 text-center">
            <h3 className="text-xl font-bold tracking-wide text-[#111827] uppercase">
              {displayName}
            </h3>
            {contactItems.length > 0 && (
              <p className="mt-1.5 text-[11.5px] text-[#4b5563]">
                {contactItems.join(' • ')}
              </p>
            )}
          </header>
        ) : (
          <header className="mb-5 border-l-4 border-[#111827] pl-3.5">
            <h3 className="text-[21px] font-bold tracking-tight text-[#111827]">
              {displayName}
            </h3>
            {contactItems.length > 0 && (
              <p className="mt-1 text-[11.5px] text-[#4b5563]">
                {contactItems.join(' | ')}
              </p>
            )}
          </header>
        )}

        {renderedSections.length === 0 ? (
          <p className="py-12 text-center text-xs text-[#6b7280]">
            Add content in any section on the left to preview your formatted resume here.
          </p>
        ) : (
          <div className="space-y-4">
            {renderedSections.map((sec) => {
              const blocks = sec.content
                .split(/\n{2,}/)
                .map((b) => b.trim())
                .filter(Boolean);

              return (
                <div key={sec.id}>
                  <h4
                    className={`mb-1.5 border-b pb-0.5 text-[11.5px] font-bold uppercase tracking-wider text-[#111827] ${
                      isAcademic ? 'border-[#1f2421]' : 'border-[#d1d5db]'
                    }`}
                  >
                    {sec.heading}
                  </h4>
                  <div className="space-y-2.5">
                    {blocks.map((block, bIdx) => {
                      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                      const plainLines: string[] = [];
                      const bullets: string[] = [];
                      for (const line of lines) {
                        if (BULLET_RE.test(line)) {
                          bullets.push(line.replace(BULLET_RE, ''));
                        } else {
                          plainLines.push(line);
                        }
                      }

                      return (
                        <div key={`${sec.id}-b-${bIdx}`}>
                          {plainLines.map((line, lIdx) => (
                            <p
                              key={`${sec.id}-b-${bIdx}-p-${lIdx}`}
                              className={lIdx === 0 && bullets.length > 0 ? 'font-semibold text-[#111827]' : 'text-[#1f2421]'}
                            >
                              {line}
                            </p>
                          ))}
                          {bullets.length > 0 && (
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[#1f2421]">
                              {bullets.map((b, k) => (
                                <li key={`${sec.id}-b-${bIdx}-li-${k}`}>{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
