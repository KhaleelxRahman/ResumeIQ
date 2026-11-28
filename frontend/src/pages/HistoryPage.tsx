import { Link } from 'react-router-dom';

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8">
        <span className="font-mono-tabular text-xs font-medium tracking-wider text-[var(--accent-secondary-ink)] uppercase">
          Progress &amp; Version History
        </span>
        <h1 className="mt-2 text-2xl font-bold">Resume Version &amp; Analysis History</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-[var(--text-secondary)]">
          Tracks version-to-version quality and keyword match progress scoped strictly to your server-issued workspace token, with 1-click deletion controls. No saved analyses exist yet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/analyze"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
          >
            Manage Workspace Session
          </Link>
          <Link
            to="/builder"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            Open Resume Builder
          </Link>
        </div>
      </div>
    </div>
  );
}
