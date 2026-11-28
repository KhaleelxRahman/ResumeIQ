import { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus the non-destructive Cancel control by default so Enter never triggers deletion accidentally.
    cancelBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busy) {
          event.preventDefault();
          onCancel();
        }
        return;
      }

      if (event.key === 'Tab') {
        const focusables = [cancelBtnRef.current, confirmBtnRef.current].filter(
          (el): el is HTMLButtonElement => Boolean(el && !el.disabled),
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && previousFocusRef.current.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252622]/45 px-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--status-danger)] px-4 text-xs font-semibold text-white hover:bg-[var(--status-danger-hover)] disabled:opacity-60"
          >
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
