import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, LayoutTemplate } from 'lucide-react';

type TemplateSlug = 'swiss-technical' | 'academic-editorial';

export function BuilderPage() {
  const [template, setTemplate] = useState<TemplateSlug>('swiss-technical');

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
        <div>
          <span className="font-mono-tabular text-xs text-[var(--accent-secondary)]">
            MODULE A // PHASE 6 TARGET
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Student Resume Builder (2 ATS-Safe Templates)
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Template switcher preview active; interactive editable sections, versioning, and ReportLab PDF export wire up in Phase 6. DOCX export is intentionally deferred until core QA passes.
          </p>
        </div>
        <Link
          to="/analyze"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
        >
          Go to Analysis Studio
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-5" aria-label="Template Selection">
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <LayoutTemplate size={17} className="text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Select ATS-Safe Editorial Template</span>
            </h2>
            <div className="grid gap-3" role="radiogroup" aria-label="Resume Template">
              <button
                type="button"
                role="radio"
                aria-checked={template === 'swiss-technical'}
                onClick={() => setTemplate('swiss-technical')}
                className={`min-h-[44px] rounded-lg border p-4 text-left transition-colors ${
                  template === 'swiss-technical'
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="font-semibold text-sm">Template A: Swiss Technical Single-Column</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Left-accent header bar, crisp tabular section rules, optimized for engineering &amp; analytics internships.
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={template === 'academic-editorial'}
                onClick={() => setTemplate('academic-editorial')}
                className={`min-h-[44px] rounded-lg border p-4 text-left transition-colors ${
                  template === 'academic-editorial'
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="font-semibold text-sm">Template B: Academic Editorial Crisp</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Centered academic masthead, education-first hierarchy for fresh graduates and research applicants.
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 text-xs text-[var(--text-secondary)]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <FileCheck2 size={15} className="text-[var(--status-success)]" aria-hidden="true" />
              <span>Self-Parse Compliance Rule</span>
            </div>
            Every exported Builder PDF will be verified through ResumeIQ&apos;s PyMuPDF parser in Phase 6 to ensure linear single-column text extraction.
          </div>
        </section>

        <section className="lg:col-span-7" aria-label="Live Paper Preview">
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
            <div className="mb-3 flex items-center justify-between font-mono-tabular text-xs text-[var(--text-secondary)]">
              <span>LIVE PAPER PREVIEW // {template.toUpperCase()}</span>
              <span>PHASE 6 EDITABLE</span>
            </div>
            <article className="min-h-[420px] rounded bg-white p-7 text-xs leading-relaxed text-[#111827] shadow-lg">
              {template === 'swiss-technical' ? (
                <div>
                  <div className="mb-4 border-l-4 border-[#111827] pl-3">
                    <h3 className="text-lg font-bold tracking-tight">Synthetic Student Candidate</h3>
                    <p className="text-[11px] text-[#4b5563]">Bengaluru | student@example.edu | github.com/student</p>
                  </div>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Technical Skills</h4>
                  <p className="mb-3">Python, TypeScript, SQL, Flask, React, PostgreSQL, Git</p>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Projects</h4>
                  <p className="font-semibold">Campus Shuttle Tracker — Python, Flask, React</p>
                  <ul className="mb-3 list-disc pl-5">
                    <li>Built REST API endpoints and interactive stop lookup interface.</li>
                  </ul>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Education</h4>
                  <p>B.Tech Computer Science — Example Institute (2023 – 2027)</p>
                </div>
              ) : (
                <div className="font-serif">
                  <div className="mb-4 border-b-2 border-[#111827] pb-2 text-center">
                    <h3 className="text-lg font-bold tracking-wide">SYNTHETIC STUDENT CANDIDATE</h3>
                    <p className="text-[11px] text-[#4b5563]">student@example.edu &bull; github.com/student &bull; linkedin.com/in/student</p>
                  </div>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Education</h4>
                  <p className="mb-3">Example Institute — B.Tech, Computer Science (Expected 2027)</p>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Technical Skills</h4>
                  <p className="mb-3">Python, SQL, R, Pandas, Flask, React, Git</p>
                  <h4 className="mb-1 border-b border-[#d1d5db] pb-0.5 text-[11px] font-bold uppercase tracking-wider">Academic Projects</h4>
                  <p className="font-semibold">Campus Shuttle Tracker (Flask, PostgreSQL)</p>
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
