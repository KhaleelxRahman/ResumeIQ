import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Info,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteResume, updateParsedVersion } from '../../services/apiClient';
import type { EditableSectionInput, ResumeDetail } from '../../types/api';

const SECTION_TYPE_OPTIONS = [
  'header_contact',
  'summary',
  'education',
  'skills',
  'projects',
  'internships',
  'experience',
  'certifications',
  'achievements',
  'languages',
  'other',
];

interface Props {
  resume: ResumeDetail;
  onUpdated: (updated: ResumeDetail) => void;
  onDeleted: (deletedId: string) => void;
}

export function EditableParsePreview({ resume, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState(resume.title);
  const [candidateLabel, setCandidateLabel] = useState(resume.version.candidate_label ?? '');
  const [sections, setSections] = useState<EditableSectionInput[]>(
    resume.version.sections.map((s) => ({
      section_type: s.section_type,
      raw_heading: s.raw_heading,
      content_text: s.content_text,
    })),
  );
  const [showRawText, setShowRawText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setTitle(resume.title);
    setCandidateLabel(resume.version.candidate_label ?? '');
    setSections(
      resume.version.sections.map((s) => ({
        section_type: s.section_type,
        raw_heading: s.raw_heading,
        content_text: s.content_text,
      })),
    );
    setConfirmDeleteOpen(false);
    setFeedback(null);
  }, [resume]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await updateParsedVersion(resume.id, resume.version.version_id, {
        title: title.trim() || resume.title,
        candidate_label: candidateLabel.trim() || null,
        sections: sections.filter((s) => s.raw_heading.trim() && s.content_text.trim()),
      });
      onUpdated(updated);
      setFeedback({
        kind: 'ok',
        text: 'Verified sections saved. Original extracted text remains preserved for evidence.',
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to save edited sections.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    try {
      await deleteResume(resume.id);
      setConfirmDeleteOpen(false);
      onDeleted(resume.id);
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to delete resume.',
      });
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const confidencePct = Math.round(resume.version.extraction_confidence * 100);
  const detectedSkills = resume.version.structured_payload.skills ?? [];

  return (
    <section
      aria-label="Editable Parse Preview"
      className="space-y-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11px] text-[var(--accent-secondary)]">
            <span>PARSE PREVIEW // {resume.source_type.toUpperCase()}</span>
            {resume.is_sample && (
              <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[var(--status-warning)]">
                READ-ONLY SAMPLE
              </span>
            )}
            {resume.version.structured_payload.user_edited && (
              <span className="rounded bg-[var(--status-success)]/15 px-2 py-0.5 text-[#86efac]">
                VERIFIED BY USER
              </span>
            )}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{resume.title}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {resume.version.word_count} extracted words
            {resume.version.file_name ? ` • File: ${resume.version.file_name}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1.5 text-right">
            <div className="font-mono-tabular text-[10px] text-[var(--text-secondary)]">CONFIDENCE</div>
            <div
              className={`font-mono-tabular text-sm font-bold ${
                confidencePct >= 80
                  ? 'text-[var(--status-success)]'
                  : confidencePct >= 60
                    ? 'text-[var(--status-warning)]'
                    : 'text-[var(--status-danger)]'
              }`}
            >
              {confidencePct}%
            </div>
          </div>

          <Link
            to={`/builder?resumeId=${encodeURIComponent(resume.id)}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
          >
            <FileEdit size={14} aria-hidden="true" />
            <span>Open in Builder</span>
          </Link>

          {!resume.is_sample && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--status-danger)]/40 bg-[var(--bg-elevated)] px-3 text-xs font-medium text-[#fda4af] hover:bg-[var(--status-danger)]/10 disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>{deleting ? 'Deleting...' : 'Delete Resume'}</span>
            </button>
          )}
        </div>
      </div>

      {resume.version.parse_warnings.length > 0 && (
        <div className="space-y-2" aria-label="Extraction Warnings">
          {resume.version.parse_warnings.map((w, idx) => (
            <div
              key={`${w.code}-${idx}`}
              className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${
                w.severity === 'warning'
                  ? 'border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 text-[#fcd34d]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
              }`}
            >
              {w.severity === 'warning' ? (
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <Info size={15} className="mt-0.5 shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
              )}
              <div>
                <span className="font-mono-tabular text-[11px] font-semibold">[{w.code}]</span>{' '}
                <span>{w.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
            EXTRACTED CONTACT SIGNALS (MASKED)
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
            <li>Email: {resume.version.masked_contact.email ?? 'Not detected'}</li>
            <li>Phone: {resume.version.masked_contact.phone ?? 'Not detected'}</li>
            <li>
              GitHub:{' '}
              {resume.version.contact_flags.has_github
                ? (resume.version.masked_contact.github ?? 'Detected')
                : 'Not detected'}
            </li>
            <li>
              LinkedIn:{' '}
              {resume.version.contact_flags.has_linkedin
                ? (resume.version.masked_contact.linkedin ?? 'Detected')
                : 'Not detected'}
            </li>
            {(resume.version.contact_flags.has_portfolio || resume.version.masked_contact.portfolio) && (
              <li>Portfolio: {resume.version.masked_contact.portfolio ?? 'Detected'}</li>
            )}
          </ul>
        </div>
        <div>
          <div className="mb-1.5 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
            DETECTED CANONICAL SKILLS ({detectedSkills.length})
          </div>
          {detectedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detectedSkills.map((sk) => (
                <span
                  key={sk}
                  className="rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono-tabular text-[11px] text-[var(--text-primary)]"
                >
                  {sk}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">
              No canonical skills matched automatically. Review Skills section below.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="parsed-title" className="mb-1 block text-xs text-[var(--text-secondary)]">
            Resume Label
          </label>
          <input
            id="parsed-title"
            type="text"
            disabled={resume.is_sample}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="parsed-candidate" className="mb-1 block text-xs text-[var(--text-secondary)]">
            Detected Candidate Header
          </label>
          <input
            id="parsed-candidate"
            type="text"
            disabled={resume.is_sample}
            value={candidateLabel}
            placeholder="Not detected"
            onChange={(e) => setCandidateLabel(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Segmented Sections ({sections.length})</h3>
          {!resume.is_sample && (
            <button
              type="button"
              onClick={() =>
                setSections((prev) => [
                  ...prev,
                  { section_type: 'other', raw_heading: 'ADDITIONAL SECTION', content_text: '' },
                ])
              }
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 text-xs font-medium hover:border-[var(--accent-primary)]"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Section</span>
            </button>
          )}
        </div>

        {sections.map((sec, idx) => (
          <div
            key={`${idx}-${sec.section_type}`}
            className="space-y-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Section ${idx + 1} category`}
                disabled={resume.is_sample}
                value={sec.section_type}
                onChange={(e) => {
                  const next = [...sections];
                  next[idx] = { ...next[idx], section_type: e.target.value };
                  setSections(next);
                }}
                className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono-tabular text-xs text-[var(--accent-secondary)] disabled:opacity-60"
              >
                {SECTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <input
                aria-label={`Section ${idx + 1} heading`}
                type="text"
                disabled={resume.is_sample}
                value={sec.raw_heading}
                onChange={(e) => {
                  const next = [...sections];
                  next[idx] = { ...next[idx], raw_heading: e.target.value };
                  setSections(next);
                }}
                className="min-w-[160px] flex-1 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-60"
              />

              {!resume.is_sample && sections.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove section ${sec.raw_heading}`}
                  onClick={() => setSections((prev) => prev.filter((_, i) => i !== idx))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--status-danger)] hover:text-[#fda4af]"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <textarea
              aria-label={`Section ${idx + 1} content`}
              rows={3}
              disabled={resume.is_sample}
              value={sec.content_text}
              onChange={(e) => {
                const next = [...sections];
                next[idx] = { ...next[idx], content_text: e.target.value };
                setSections(next);
              }}
              className="w-full rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] disabled:opacity-75"
            />
          </div>
        ))}
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
            feedback.kind === 'ok'
              ? 'border-[var(--status-success)]/40 bg-[var(--status-success)]/10 text-[#86efac]'
              : 'border-[var(--status-danger)]/40 bg-[var(--status-danger)]/10 text-[#fda4af]'
          }`}
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
        <button
          type="button"
          onClick={() => setShowRawText((v) => !v)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {showRawText ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
          <span>{showRawText ? 'Hide Original Extracted Text' : 'Inspect Original Extracted Text'}</span>
        </button>

        {!resume.is_sample && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            <Save size={16} aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save Verified Sections'}</span>
          </button>
        )}
      </div>

      {showRawText && (
        <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5">
          <div className="mb-1.5 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
            PRESERVED IMMUTABLE EXTRACTION SOURCE (raw_text)
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono-tabular text-xs leading-relaxed text-[var(--text-secondary)]">
            {resume.version.raw_text}
          </pre>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Resume Permanently?"
        description={`Permanently delete "${resume.title}" and all parsed sections from this workspace? This action cannot be undone.`}
        confirmLabel="Confirm Delete Resume"
        busy={deleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </section>
  );
}
