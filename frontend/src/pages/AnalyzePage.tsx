import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EditableParsePreview } from '../features/studio/EditableParsePreview';
import { ResumeDropzone } from '../features/studio/ResumeDropzone';
import {
  ensureServerWorkspaceSession,
  fetchHealth,
  fetchJobRoles,
  fetchResumeDetail,
  fetchWorkspaceResumes,
  purgeCurrentWorkspace,
} from '../services/apiClient';
import type {
  HealthResponse,
  JobRoleSummary,
  ResumeDetail,
  ResumeListItem,
  WorkspaceStatusResponse,
} from '../types/api';

export function AnalyzePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceStatusResponse | null>(null);
  const [roles, setRoles] = useState<JobRoleSummary[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [activeResume, setActiveResume] = useState<ResumeDetail | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to Flask parsing engine...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);

  const loadStudioState = async () => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage('Verifying backend health and issuing server workspace session...');
    try {
      const [h, ws, r] = await Promise.all([
        fetchHealth(),
        ensureServerWorkspaceSession(),
        fetchJobRoles(),
      ]);
      const list = await fetchWorkspaceResumes(true);
      setHealth(h);
      setWorkspace(ws);
      setRoles(r);
      setResumes(list);
      setStatusMessage('Ready to upload PDF/DOCX resumes or inspect synthetic samples.');
      if (list.length > 0 && !activeResume) {
        const first = await fetchResumeDetail(list[0].id);
        setActiveResume(first);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not reach Flask API. Start backend on port 5000.',
      );
      setStatusMessage('Backend offline.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadStudioState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectResume = async (resumeId: string) => {
    setErrorMessage(null);
    try {
      const detail = await fetchResumeDetail(resumeId);
      setActiveResume(detail);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load resume detail.');
    }
  };

  const handleUploaded = async (detail: ResumeDetail) => {
    setActiveResume(detail);
    const updatedList = await fetchWorkspaceResumes(true);
    setResumes(updatedList);
  };

  const handleUpdated = async (updated: ResumeDetail) => {
    setActiveResume(updated);
    const updatedList = await fetchWorkspaceResumes(true);
    setResumes(updatedList);
  };

  const handleDeleted = async (deletedId: string) => {
    const updatedList = await fetchWorkspaceResumes(true);
    setResumes(updatedList);
    if (activeResume?.id === deletedId) {
      if (updatedList.length > 0) {
        const next = await fetchResumeDetail(updatedList[0].id);
        setActiveResume(next);
      } else {
        setActiveResume(null);
      }
    }
  };

  const handlePurgeWorkspace = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await purgeCurrentWorkspace();
      setActiveResume(null);
      const nextWs = await ensureServerWorkspaceSession();
      const updatedList = await fetchWorkspaceResumes(true);
      setWorkspace(nextWs);
      setResumes(updatedList);
      setStatusMessage('Workspace purged on server; fresh server-issued session active.');
      if (updatedList.length > 0) {
        setActiveResume(await fetchResumeDetail(updatedList[0].id));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to purge workspace.');
    } finally {
      setBusy(false);
      setConfirmPurgeOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <div className="mb-6 border-b border-[var(--border-hairline)] pb-5">
        <span className="font-mono-tabular text-xs text-[var(--accent-secondary)]">
          PHASE 5 // RESUME UPLOAD &amp; PARSING STUDIO
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Upload, Extract &amp; Verify Resume Structure
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Upload a PDF or DOCX resume to inspect extracted sections, layout warnings, and confidence scores. Deterministic Quality/ATS scoring and Role Matching arrive in Phases 7–8.
        </p>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2.5">
          {errorMessage ? (
            <AlertCircle size={17} className="text-[var(--status-danger)]" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={17} className="text-[var(--status-success)]" aria-hidden="true" />
          )}
          <span>{errorMessage ?? statusMessage}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadStudioState()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-xs font-medium hover:border-[var(--accent-primary)] disabled:opacity-60"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={busy || !workspace}
            onClick={() => setConfirmPurgeOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--status-danger)]/40 bg-[var(--bg-elevated)] px-3 text-xs font-medium text-[#fda4af] hover:bg-[var(--status-danger)]/10 disabled:opacity-50"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Purge Workspace</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <ResumeDropzone disabled={!workspace || !health} onUploaded={(d) => void handleUploaded(d)} />

          <section
            aria-label="Workspace Resumes and Synthetic Samples"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
          >
            <h2 className="mb-3 text-sm font-semibold">Workspace Resumes &amp; Synthetic Samples</h2>
            <ul className="space-y-2">
              {resumes.map((item) => {
                const selected = activeResume?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelectResume(item.id)}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate text-xs font-semibold">
                          <FileText size={13} className="shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <div className="mt-0.5 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                          {item.is_sample ? 'SAMPLE' : item.source_type.toUpperCase()} • {item.word_count} words
                        </div>
                      </div>
                      <span className="shrink-0 font-mono-tabular text-xs text-[var(--accent-secondary)]">
                        {Math.round(item.extraction_confidence * 100)}%
                      </span>
                    </button>
                  </li>
                );
              })}
              {resumes.length === 0 && (
                <li className="text-xs text-[var(--text-secondary)]">No resumes available yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
            <h2 className="mb-2 text-sm font-semibold">Target Roles Ready for Phase 7–8</h2>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r.id}
                  className="rounded border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1 font-mono-tabular text-[11px] text-[var(--text-secondary)]"
                >
                  {r.title}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7">
          {activeResume ? (
            <EditableParsePreview
              resume={activeResume}
              onUpdated={(u) => void handleUpdated(u)}
              onDeleted={(id) => void handleDeleted(id)}
            />
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8 text-center">
              <p className="text-sm font-medium">Upload a PDF/DOCX resume or select a synthetic sample</p>
              <p className="mt-1 max-w-[44ch] text-xs text-[var(--text-secondary)]">
                Extracted sections, layout warnings, and masked contact flags will appear here for verification.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmPurgeOpen}
        title="Purge Entire Workspace Session?"
        description="This permanently deletes all uploaded resumes, edited sections, and saved analyses tied to your active workspace token, and resets your session."
        confirmLabel="Confirm Purge Workspace"
        busy={busy}
        onCancel={() => setConfirmPurgeOpen(false)}
        onConfirm={handlePurgeWorkspace}
      />
    </div>
  );
}
