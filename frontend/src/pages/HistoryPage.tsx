import { Link } from 'react-router-dom';

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8">
        <span className="font-mono-tabular text-xs text-[var(--accent-secondary)]">
          PROGRESS &amp; VERSION HISTORY // PHASE 10 TARGET
        </span>
        <h1 className="mt-2 text-2xl font-bold">Resume Version &amp; Analysis History</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-[var(--text-secondary)]">
          Tracks version-to-version quality and keyword match progress scoped strictly to your server-issued workspace token, with 1-click deletion controls.
        </p>
        <div className="mt-6">
          <Link
            to="/analyze"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)]"
          >
            Manage Workspace Session
          </Link>
        </div>
      </div>
    </div>
  );
}
