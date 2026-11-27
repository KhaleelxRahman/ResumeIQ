import {
  CheckCircle2,
  CopyPlus,
  Download,
  FilePlus2,
  FolderOpen,
  History,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  BuilderTemplateSlug,
  ResumeListItem,
  ResumeVersionSummary,
} from '../../types/api';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

interface BuilderHeaderProps {
  title: string;
  titleError?: string;
  resumeId: string | null;
  versionId: string | null;
  versionNumber: number;
  versions: ResumeVersionSummary[];
  templateSlug: BuilderTemplateSlug;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  busyAction: 'save' | 'version' | 'export' | 'delete' | 'load' | null;
  availableResumes: ResumeListItem[];
  mobilePane: 'editor' | 'preview';
  onChangeMobilePane: (pane: 'editor' | 'preview') => void;
  onChangeTitle: (title: string) => void;
  onChangeTemplate: (slug: BuilderTemplateSlug) => void;
  onSelectResume: (resumeId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onCreateBlank: () => void;
  onLoadStarter: () => void;
  onSaveDraft: () => void;
  onSaveNewVersion: () => void;
  onExportPdf: () => void;
  onRequestDelete: () => void;
}

function formatSavedTime(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function BuilderHeader({
  title,
  titleError,
  resumeId,
  versionId,
  versionNumber,
  versions,
  templateSlug,
  saveStatus,
  lastSavedAt,
  busyAction,
  availableResumes,
  mobilePane,
  onChangeMobilePane,
  onChangeTitle,
  onChangeTemplate,
  onSelectResume,
  onSelectVersion,
  onCreateBlank,
  onLoadStarter,
  onSaveDraft,
  onSaveNewVersion,
  onExportPdf,
  onRequestDelete,
}: BuilderHeaderProps) {
  const anyBusy = busyAction !== null;
  const savedLabel = formatSavedTime(lastSavedAt);

  return (
    <div className="no-print mb-6 space-y-4 border-b border-[var(--border-hairline)] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-secondary)]">
            <span className="font-mono-tabular uppercase tracking-wider text-[var(--accent-secondary)]">
              Resume Builder
            </span>
            <span aria-hidden="true">•</span>
            <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 font-medium">
              {saveStatus === 'saving' && <span className="text-[var(--accent-secondary)]">Saving changes...</span>}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 size={14} className="text-[var(--status-success)]" aria-hidden="true" />
                  <span className="text-[#86efac]">
                    {savedLabel ? `Saved at ${savedLabel}` : 'Saved to workspace'}
                  </span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-[#fcd34d]">Unsaved changes</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-[#fda4af]">Save failed — review and retry</span>
              )}
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Student Resume Builder
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Edit structured sections, switch between two ATS-friendly templates, save versions, and export a print-ready PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={anyBusy}
            onClick={onCreateBlank}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] disabled:opacity-50"
          >
            <FilePlus2 size={14} aria-hidden="true" />
            <span>New Blank</span>
          </button>

          <button
            type="button"
            disabled={anyBusy}
            onClick={onLoadStarter}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] disabled:opacity-50"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Student Starter</span>
          </button>

          <Link
            to="/analyze"
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
          >
            <FolderOpen size={14} aria-hidden="true" />
            <span>Upload / Studio</span>
          </Link>
        </div>
      </div>

      {/* Document controls row */}
      <div className="grid gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          <label htmlFor="builder-resume-title" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Resume Title
          </label>
          <input
            id="builder-resume-title"
            type="text"
            value={title}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? 'builder-title-error' : undefined}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="e.g., Web Developer Internship Resume"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {titleError && (
            <p id="builder-title-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {titleError}
            </p>
          )}
        </div>

        <div className="lg:col-span-3">
          <label htmlFor="builder-load-resume" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Open Saved Resume
          </label>
          <select
            id="builder-load-resume"
            disabled={anyBusy}
            value={resumeId ?? ''}
            onChange={(e) => {
              if (e.target.value) onSelectResume(e.target.value);
            }}
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] disabled:opacity-60"
          >
            <option value="">Current unsaved draft</option>
            {availableResumes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="builder-template-select" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            ATS Template
          </label>
          <select
            id="builder-template-select"
            value={templateSlug}
            onChange={(e) => onChangeTemplate(e.target.value as BuilderTemplateSlug)}
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="swiss-technical">Swiss Technical</option>
            <option value="academic-editorial">Academic Editorial</option>
          </select>
        </div>

        <div className="lg:col-span-3">
          <label htmlFor="builder-version-select" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <History size={13} aria-hidden="true" />
            <span>Version</span>
          </label>
          {versions.length > 0 ? (
            <select
              id="builder-version-select"
              disabled={anyBusy}
              value={versionId ?? ''}
              onChange={(e) => {
                if (e.target.value) onSelectVersion(e.target.value);
              }}
              className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 font-mono-tabular text-xs text-[var(--text-primary)] disabled:opacity-60"
            >
              {versions.map((v) => (
                <option key={v.version_id} value={v.version_id}>
                  v{v.version_number} ({v.word_count} words)
                </option>
              ))}
            </select>
          ) : (
            <div
              id="builder-version-select"
              className="flex min-h-[42px] items-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 font-mono-tabular text-xs text-[var(--text-secondary)]"
            >
              v{versionNumber} (unsaved draft)
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3 lg:col-span-12">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={anyBusy}
              onClick={onSaveDraft}
              className="inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            >
              <Save size={15} aria-hidden="true" />
              <span>{busyAction === 'save' ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {resumeId && (
              <button
                type="button"
                disabled={anyBusy}
                onClick={onSaveNewVersion}
                className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] disabled:opacity-50"
              >
                <CopyPlus size={14} aria-hidden="true" />
                <span>{busyAction === 'version' ? 'Saving Version...' : 'Save New Version'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={anyBusy}
              onClick={onExportPdf}
              className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-secondary)] disabled:opacity-50"
            >
              <Download size={14} aria-hidden="true" />
              <span>{busyAction === 'export' ? 'Exporting PDF...' : 'Export PDF'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile / Tablet Pane Switcher */}
            <div
              role="group"
              aria-label="Builder view mode"
              className="inline-flex rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] p-0.5 xl:hidden"
            >
              <button
                type="button"
                aria-pressed={mobilePane === 'editor'}
                onClick={() => onChangeMobilePane('editor')}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium whitespace-nowrap ${
                  mobilePane === 'editor'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                aria-pressed={mobilePane === 'preview'}
                onClick={() => onChangeMobilePane('preview')}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium whitespace-nowrap ${
                  mobilePane === 'preview'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Paper Preview
              </button>
            </div>

            {resumeId && (
              <button
                type="button"
                disabled={anyBusy}
                onClick={onRequestDelete}
                className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--status-danger)]/40 bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[#fda4af] hover:bg-[var(--status-danger)]/10 disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Delete Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
