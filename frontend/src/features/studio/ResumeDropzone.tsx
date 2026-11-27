import { useId, useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, FileUp, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { ApiClientError, uploadResumeFile } from '../../services/apiClient';
import type { ResumeDetail } from '../../types/api';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = new Set(['pdf', 'docx']);

interface Props {
  disabled?: boolean;
  onUploaded: (detail: ResumeDetail) => void;
}

function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function mapUploadErrorGuidance(err: unknown): { title: string; detail: string; code?: string } {
  if (err instanceof ApiClientError) {
    if (err.code === 'SCANNED_PDF_DETECTED') {
      return {
        code: err.code,
        title: 'Scanned / Image-Only PDF Detected',
        detail:
          'No selectable text layer was found in this PDF. Export a text-selectable PDF from your editor or upload a DOCX file instead.',
      };
    }
    if (
      err.code === 'UNSUPPORTED_FILE_TYPE' ||
      err.code === 'UNSUPPORTED_MEDIA_TYPE' ||
      err.code === 'INVALID_FILE_SIGNATURE' ||
      err.code === 'INVALID_OOXML_DOCUMENT' ||
      err.code === 'MACRO_ENABLED_DOCUMENT_UNSUPPORTED'
    ) {
      return {
        code: err.code,
        title: 'Unsupported or Invalid File Format',
        detail: err.message,
      };
    }
    if (
      err.code === 'CORRUPTED_DOCUMENT' ||
      err.code === 'CORRUPTED_OR_UNSAFE_DOCUMENT' ||
      err.code === 'ZIP_BOMB_DETECTED' ||
      err.code === 'ENCRYPTED_DOCUMENT_UNSUPPORTED' ||
      err.code === 'ENCRYPTED_OR_LEGACY_DOC' ||
      err.code === 'EMPTY_DOCUMENT'
    ) {
      return {
        code: err.code,
        title: 'Document Could Not Be Parsed',
        detail: err.message,
      };
    }
    return {
      code: err.code,
      title: 'Upload Rejected',
      detail: err.message,
    };
  }

  return {
    title: 'Upload Connection Error',
    detail: err instanceof Error ? err.message : 'Unable to reach the Flask parsing server.',
  };
}

export function ResumeDropzone({ disabled = false, onUploaded }: Props) {
  const inputId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [errorState, setErrorState] = useState<{ title: string; detail: string; code?: string } | null>(
    null,
  );
  const [successName, setSuccessName] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorState(null);
    setSuccessName(null);

    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTS.has(ext)) {
      setErrorState({
        code: 'UNSUPPORTED_FILE_TYPE',
        title: 'Unsupported File Format',
        detail: `"${file.name}" is not a .pdf or .docx resume. Choose a valid PDF or Word (.docx) file.`,
      });
      return;
    }

    if (file.size === 0) {
      setErrorState({
        code: 'EMPTY_DOCUMENT',
        title: 'Empty File Selected',
        detail: 'The selected file is 0 bytes and contains no resume text.',
      });
      return;
    }

    if (file.size > MAX_BYTES) {
      setErrorState({
        code: 'FILE_TOO_LARGE',
        title: 'File Exceeds 5 MB Limit',
        detail: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Compress or remove oversized images to stay under 5 MB.`,
      });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadResumeFile(file, customTitle);
      setSuccessName(file.name);
      setCustomTitle('');
      onUploaded(result);
    } catch (err) {
      setErrorState(mapUploadErrorGuidance(err));
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      void processFile(dropped);
    }
  };

  return (
    <section
      aria-label="Resume Upload Dropzone"
      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Upload PDF or DOCX Resume</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Strict 5 MB limit. Magic-byte &amp; OOXML safety verified; original binary deleted immediately after extraction.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[11px] text-[var(--accent-secondary)]">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>ZERO BINARY RETENTION</span>
        </span>
      </div>

      <div className="mb-3">
        <label htmlFor={titleId} className="mb-1 block text-xs text-[var(--text-secondary)]">
          Optional Label (e.g., &ldquo;Web Dev Draft v1&rdquo;)
        </label>
        <input
          id={titleId}
          type="text"
          value={customTitle}
          maxLength={120}
          disabled={disabled || uploading}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Defaults to uploaded filename"
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-disabled={disabled || uploading}
        aria-label="Drop PDF or DOCX resume here or press Enter to browse files"
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-[168px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
            : 'border-[var(--border-strong)] bg-[var(--bg-canvas)] hover:border-[var(--accent-secondary)]'
        } ${disabled || uploading ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void processFile(chosen);
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
            <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" aria-hidden="true" />
            <p className="text-sm font-medium">Extracting text, detecting layout &amp; segmenting sections...</p>
            <p className="text-xs text-[var(--text-secondary)]">Checking magic bytes and removing temp file automatically</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileUp size={26} className="text-[var(--accent-secondary)]" aria-hidden="true" />
            <p className="text-sm font-medium">
              Drag &amp; drop your <span className="font-mono-tabular text-[var(--accent-secondary)]">.pdf</span> or{' '}
              <span className="font-mono-tabular text-[var(--accent-secondary)]">.docx</span> resume here
            </p>
            <p className="text-xs text-[var(--text-secondary)]">or click / press Enter to choose a file (max 5 MB)</p>
          </div>
        )}
      </div>

      {successName && !errorState && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg border border-[var(--status-success)]/40 bg-[var(--status-success)]/10 px-3.5 py-2.5 text-xs text-[#86efac]"
        >
          Successfully extracted &ldquo;{successName}&rdquo;. Review and verify parsed sections on the right before analysis.
        </div>
      )}

      {errorState && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-lg border border-[var(--status-danger)]/50 bg-[var(--status-danger)]/10 px-3.5 py-3 text-xs"
        >
          {errorState.code === 'SCANNED_PDF_DETECTED' ? (
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--status-warning)]" aria-hidden="true" />
          ) : (
            <XCircle size={17} className="mt-0.5 shrink-0 text-[var(--status-danger)]" aria-hidden="true" />
          )}
          <div>
            <div className="font-semibold text-[var(--text-primary)]">
              {errorState.title}
              {errorState.code && (
                <span className="ml-2 font-mono-tabular text-[10px] text-[var(--text-secondary)]">
                  [{errorState.code}]
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[var(--text-secondary)]">{errorState.detail}</p>
          </div>
        </div>
      )}
    </section>
  );
}
