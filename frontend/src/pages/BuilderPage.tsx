import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BuilderHeader, type SaveStatus } from '../features/builder/BuilderHeader';
import { PersonalInfoForm } from '../features/builder/PersonalInfoForm';
import { ResumePaperPreview } from '../features/builder/ResumePaperPreview';
import { SectionSidebar } from '../features/builder/SectionSidebar';
import { StructuredSectionEditor } from '../features/builder/StructuredSectionEditor';
import {
  buildCreateResumePayload,
  buildPatchDraftPayload,
  buildSaveVersionPayload,
  createBlankDocument,
  createSectionState,
  createStudentStarterDocument,
  documentSignature,
  moveSectionByOffset,
  resumeDetailToBuilderDocument,
  toFriendlyBuilderError,
  validateBuilderDocument,
  type BuilderDocumentState,
  type BuilderSectionState,
  type BuilderValidationErrors,
} from '../features/builder/builderModel';
import {
  createBuilderResume,
  deleteResume,
  downloadResumePdf,
  ensureServerWorkspaceSession,
  fetchResumeDetail,
  fetchWorkspaceResumes,
  saveBuilderVersion,
  updateParsedVersion,
} from '../services/apiClient';
import type {
  BuilderSectionType,
  ResumeDetail,
  ResumeListItem,
  ResumeVersionSummary,
} from '../types/api';

const EMPTY_ERRORS: BuilderValidationErrors = { dateIssues: {}, urlIssues: {} };

type PendingNavigation =
  | { kind: 'blank' }
  | { kind: 'starter' }
  | { kind: 'load'; resumeId: string; versionId?: string };

export function BuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBlank = useMemo(() => createBlankDocument('swiss-technical'), []);

  const [doc, setDoc] = useState<BuilderDocumentState>(initialBlank);
  const [savedSignature, setSavedSignature] = useState<string>(() => documentSignature(initialBlank));
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [availableResumes, setAvailableResumes] = useState<ResumeListItem[]>([]);
  const [activeTarget, setActiveTarget] = useState<'personal' | string>('personal');
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');

  const [errors, setErrors] = useState<BuilderValidationErrors>(EMPTY_ERRORS);
  const [saveErrorText, setSaveErrorText] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busyAction, setBusyAction] = useState<'save' | 'version' | 'export' | 'delete' | 'load' | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<PendingNavigation | null>(null);

  const isDirty = useMemo(() => {
    if (doc.isSample) return false;
    return documentSignature(doc) !== savedSignature;
  }, [doc, savedSignature]);

  const saveStatus: SaveStatus = useMemo(() => {
    if (busyAction === 'save' || busyAction === 'version') return 'saving';
    if (saveErrorText) return 'error';
    if (isDirty) return 'unsaved';
    return 'saved';
  }, [busyAction, saveErrorText, isDirty]);

  const syncFromDetail = useCallback(
    (detail: ResumeDetail, updateUrl = true) => {
      const hydrated = resumeDetailToBuilderDocument(detail);
      setDoc(hydrated);
      setSavedSignature(documentSignature(hydrated));
      setVersions(
        detail.versions ?? [
          {
            version_id: detail.version.version_id,
            version_number: detail.version.version_number,
            template_slug: detail.version.template_slug,
            word_count: detail.version.word_count,
            created_at: detail.version.created_at,
          },
        ],
      );
      setLastSavedAt(detail.updated_at);
      setErrors(EMPTY_ERRORS);
      setSaveErrorText(null);
      setActiveTarget('personal');

      if (updateUrl) {
        setSearchParams(
          {
            resumeId: detail.id,
            versionId: detail.version.version_id,
          },
          { replace: true },
        );
      }
    },
    [setSearchParams],
  );

  const refreshResumeList = useCallback(async () => {
    try {
      const list = await fetchWorkspaceResumes(true);
      setAvailableResumes(list);
    } catch {
      // Non-blocking list refresh; handled on explicit actions if offline.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      setBusyAction('load');
      try {
        await ensureServerWorkspaceSession();
        const list = await fetchWorkspaceResumes(true);
        if (!active) return;
        setAvailableResumes(list);

        const paramResumeId = searchParams.get('resumeId');
        const paramVersionId = searchParams.get('versionId') ?? undefined;
        if (paramResumeId) {
          const detail = await fetchResumeDetail(paramResumeId, paramVersionId);
          if (!active) return;
          syncFromDetail(detail, false);
        }
      } catch (err) {
        if (!active) return;
        setBanner({
          kind: 'err',
          text: toFriendlyBuilderError(err, 'Could not load your saved resume. You can still start a new draft.'),
        });
      } finally {
        if (active) setBusyAction(null);
      }
    };

    void init();
    return () => {
      active = false;
    };
    // Run once on initial mount using starting query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const applyPendingNavigation = useCallback(
    async (nav: PendingNavigation) => {
      setBanner(null);
      setErrors(EMPTY_ERRORS);
      setSaveErrorText(null);

      if (nav.kind === 'blank') {
        const blank = createBlankDocument(doc.templateSlug);
        setDoc(blank);
        setSavedSignature(documentSignature(blank));
        setVersions([]);
        setLastSavedAt(null);
        setActiveTarget('personal');
        setSearchParams({}, { replace: true });
        setBanner({ kind: 'info', text: 'Started a blank resume draft. Add only your real details.' });
        return;
      }

      if (nav.kind === 'starter') {
        const starter = createStudentStarterDocument(doc.templateSlug);
        setDoc(starter);
        setSavedSignature('__unsaved_starter__');
        setVersions([]);
        setLastSavedAt(null);
        setActiveTarget('personal');
        setSearchParams({}, { replace: true });
        setBanner({
          kind: 'info',
          text: 'Loaded the student starter structure. Replace the sample prompts with your actual information before saving.',
        });
        return;
      }

      setBusyAction('load');
      try {
        const detail = await fetchResumeDetail(nav.resumeId, nav.versionId);
        syncFromDetail(detail, true);
      } catch (err) {
        setBanner({
          kind: 'err',
          text: toFriendlyBuilderError(err, 'Could not open that resume right now. Please try again.'),
        });
      } finally {
        setBusyAction(null);
      }
    },
    [doc.templateSlug, setSearchParams, syncFromDetail],
  );

  const requestNavigation = (nav: PendingNavigation) => {
    if (isDirty) {
      setPendingNav(nav);
      return;
    }
    void applyPendingNavigation(nav);
  };

  const persistDraft = async (): Promise<ResumeDetail | null> => {
    const check = validateBuilderDocument(doc);
    setErrors(check.errors);
    if (!check.valid) {
      const msg =
        check.errors.title ||
        check.errors.full_name ||
        check.errors.email ||
        check.errors.sections ||
        'Please fix the highlighted validation fields before saving.';
      setSaveErrorText(msg);
      setBanner({ kind: 'err', text: msg });
      return null;
    }

    setBusyAction('save');
    setSaveErrorText(null);
    setBanner(null);

    try {
      const detail =
        doc.resumeId && doc.versionId && !doc.isSample
          ? await updateParsedVersion(doc.resumeId, doc.versionId, buildPatchDraftPayload(doc))
          : await createBuilderResume(buildCreateResumePayload(doc));

      syncFromDetail(detail, true);
      await refreshResumeList();
      setBanner({
        kind: 'ok',
        text: `Draft saved cleanly (v${detail.version.version_number}).`,
      });
      return detail;
    } catch (err) {
      const friendly = toFriendlyBuilderError(err, 'Your changes could not be saved. Please retry.');
      setSaveErrorText(friendly);
      setBanner({ kind: 'err', text: friendly });
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveNewVersion = async () => {
    if (!doc.resumeId || doc.isSample) {
      await persistDraft();
      return;
    }

    const check = validateBuilderDocument(doc);
    setErrors(check.errors);
    if (!check.valid) {
      const msg =
        check.errors.title ||
        check.errors.full_name ||
        check.errors.email ||
        check.errors.sections ||
        'Please fix the highlighted validation fields before creating a new version.';
      setSaveErrorText(msg);
      setBanner({ kind: 'err', text: msg });
      return;
    }

    setBusyAction('version');
    setSaveErrorText(null);
    setBanner(null);

    try {
      const detail = await saveBuilderVersion(doc.resumeId, buildSaveVersionPayload(doc));
      syncFromDetail(detail, true);
      await refreshResumeList();
      setBanner({
        kind: 'ok',
        text: `Created new saved snapshot v${detail.version.version_number}.`,
      });
    } catch (err) {
      const friendly = toFriendlyBuilderError(err, 'Could not create a new saved version. Please retry.');
      setSaveErrorText(friendly);
      setBanner({ kind: 'err', text: friendly });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicateSample = async () => {
    const editableCopy: BuilderDocumentState = {
      ...doc,
      resumeId: null,
      versionId: null,
      versionNumber: 1,
      isSample: false,
      sourceType: 'builder',
      title: doc.title.includes('(Copy)') ? doc.title : `${doc.title} (Editable Copy)`,
    };

    const check = validateBuilderDocument(editableCopy);
    if (!check.valid) {
      setDoc(editableCopy);
      setSavedSignature('__unsaved_copy__');
      setVersions([]);
      setSearchParams({}, { replace: true });
      setBanner({ kind: 'info', text: 'Created editable copy. Review fields and click Save Draft.' });
      return;
    }

    setBusyAction('save');
    setBanner(null);
    try {
      const created = await createBuilderResume(buildCreateResumePayload(editableCopy));
      syncFromDetail(created, true);
      await refreshResumeList();
      setBanner({
        kind: 'ok',
        text: 'Editable draft copy created in your workspace.',
      });
    } catch (err) {
      setBanner({
        kind: 'err',
        text: toFriendlyBuilderError(err, 'Could not duplicate this sample right now.'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportPdf = async () => {
    setBanner(null);
    let targetResumeId = doc.resumeId;
    let targetVersionId = doc.versionId;

    if (!doc.isSample && (!targetResumeId || !targetVersionId || isDirty)) {
      const saved = await persistDraft();
      if (!saved) return;
      targetResumeId = saved.id;
      targetVersionId = saved.version.version_id;
    }

    if (!targetResumeId || !targetVersionId) return;

    setBusyAction('export');
    try {
      const safeStem = (doc.title.trim() || 'resume').replace(/[^a-zA-Z0-9_-]+/g, '_');
      const fileName = await downloadResumePdf(
        targetResumeId,
        targetVersionId,
        `${safeStem}_v${doc.versionNumber}.pdf`,
      );
      setBanner({
        kind: 'ok',
        text: `PDF exported (${fileName}).`,
      });
    } catch (err) {
      setBanner({
        kind: 'err',
        text: toFriendlyBuilderError(err, 'Could not generate the PDF export right now. Please try again.'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteResume = async () => {
    if (!doc.resumeId || doc.isSample) return;
    setBusyAction('delete');
    setBanner(null);
    try {
      await deleteResume(doc.resumeId);
      setConfirmDeleteOpen(false);
      await refreshResumeList();
      const blank = createBlankDocument(doc.templateSlug);
      setDoc(blank);
      setSavedSignature(documentSignature(blank));
      setVersions([]);
      setLastSavedAt(null);
      setSearchParams({}, { replace: true });
      setBanner({ kind: 'info', text: 'Resume deleted from this workspace.' });
    } catch (err) {
      setConfirmDeleteOpen(false);
      setBanner({
        kind: 'err',
        text: toFriendlyBuilderError(err, 'Could not delete this resume. Please retry.'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleMoveSection = (index: number, offset: -1 | 1) => {
    setDoc((prev) => ({
      ...prev,
      sections: moveSectionByOffset(prev.sections, index, offset),
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setDoc((prev) => {
      if (prev.sections.length <= 1) return prev;
      const nextSections = prev.sections.filter((s) => s.id !== sectionId);
      if (activeTarget === sectionId) {
        setActiveTarget(nextSections[0]?.id ?? 'personal');
      }
      return { ...prev, sections: nextSections };
    });
  };

  const handleAddSection = (type: BuilderSectionType, customHeading?: string) => {
    const newSec = createSectionState(type, customHeading);
    setDoc((prev) => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));
    setActiveTarget(newSec.id);
  };

  const updateSection = (updated: BuilderSectionState) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const activeSection = doc.sections.find((s) => s.id === activeTarget) ?? null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
      <BuilderHeader
        title={doc.title}
        titleError={errors.title}
        resumeId={doc.resumeId}
        versionId={doc.versionId}
        versionNumber={doc.versionNumber}
        versions={versions}
        isSample={doc.isSample}
        templateSlug={doc.templateSlug}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        busyAction={busyAction}
        availableResumes={availableResumes}
        mobilePane={mobilePane}
        onChangeMobilePane={(pane) => {
          setMobilePane(pane);
          if (pane === 'preview') {
            window.requestAnimationFrame(() => {
              document.getElementById('builder-preview-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        }}
        onChangeTitle={(nextTitle) => setDoc((prev) => ({ ...prev, title: nextTitle }))}
        onChangeTemplate={(nextSlug) => setDoc((prev) => ({ ...prev, templateSlug: nextSlug }))}
        onSelectResume={(resumeId) => requestNavigation({ kind: 'load', resumeId })}
        onSelectVersion={(versionId) => {
          if (doc.resumeId) requestNavigation({ kind: 'load', resumeId: doc.resumeId, versionId });
        }}
        onCreateBlank={() => requestNavigation({ kind: 'blank' })}
        onLoadStarter={() => requestNavigation({ kind: 'starter' })}
        onDuplicateSample={() => void handleDuplicateSample()}
        onSaveDraft={() => void persistDraft()}
        onSaveNewVersion={() => void handleSaveNewVersion()}
        onExportPdf={() => void handleExportPdf()}
        onRequestDelete={() => setConfirmDeleteOpen(true)}
      />

      {doc.isSample && (
        <div
          role="status"
          className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 px-4 py-3 text-xs text-[#fcd34d]"
        >
          <div className="flex items-center gap-2">
            <Info size={15} className="shrink-0" aria-hidden="true" />
            <span>
              Viewing a read-only synthetic sample resume. Create an editable copy to customize fields and save versions.
            </span>
          </div>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleDuplicateSample()}
            className="min-h-[36px] rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            Create Editable Copy
          </button>
        </div>
      )}

      {banner && (
        <div
          role={banner.kind === 'err' ? 'alert' : 'status'}
          aria-live="polite"
          className={`no-print mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs ${
            banner.kind === 'ok'
              ? 'border-[var(--status-success)]/40 bg-[var(--status-success)]/10 text-[#86efac]'
              : banner.kind === 'err'
                ? 'border-[var(--status-danger)]/40 bg-[var(--status-danger)]/10 text-[#fda4af]'
                : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
          }`}
        >
          {banner.kind === 'err' ? (
            <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
          ) : banner.kind === 'ok' ? (
            <CheckCircle2 size={15} className="shrink-0" aria-hidden="true" />
          ) : (
            <Info size={15} className="shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Main Builder Studio Split: Section Rail + Structured Editor + Live Paper Preview */}
      <div className="grid gap-6 xl:grid-cols-12">
        <div
          className={`space-y-5 xl:col-span-7 xl:grid xl:grid-cols-12 xl:gap-5 xl:space-y-0 ${
            mobilePane === 'preview' ? 'hidden xl:grid' : 'block'
          }`}
        >
          <div className="xl:col-span-4">
            <SectionSidebar
              activeTarget={activeTarget}
              sections={doc.sections}
              readOnly={doc.isSample}
              onSelectTarget={setActiveTarget}
              onMoveSection={handleMoveSection}
              onRemoveSection={handleRemoveSection}
              onAddSection={handleAddSection}
            />
          </div>

          <div className="xl:col-span-8">
            {activeTarget === 'personal' || !activeSection ? (
              <PersonalInfoForm
                contact={doc.contact}
                errors={errors}
                readOnly={doc.isSample}
                onChange={(nextContact) => setDoc((prev) => ({ ...prev, contact: nextContact }))}
              />
            ) : (
              <StructuredSectionEditor
                section={activeSection}
                errors={errors}
                readOnly={doc.isSample}
                onChange={updateSection}
              />
            )}
          </div>
        </div>

        <div
          id="builder-preview-pane"
          className={`xl:col-span-5 ${
            mobilePane === 'editor' ? 'hidden xl:block' : 'block'
          }`}
        >
          <ResumePaperPreview document={doc} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Resume Permanently?"
        description={`Delete "${doc.title}" and all saved builder versions from your workspace? This cannot be undone.`}
        confirmLabel="Confirm Delete Resume"
        busy={busyAction === 'delete'}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteResume}
      />

      <ConfirmDialog
        open={pendingNav !== null}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in your current resume draft. Continuing will replace the current editor view."
        confirmLabel="Discard & Continue"
        onCancel={() => setPendingNav(null)}
        onConfirm={() => {
          const nav = pendingNav;
          setPendingNav(null);
          if (nav) {
            void applyPendingNavigation(nav);
          }
        }}
      />
    </div>
  );
}
