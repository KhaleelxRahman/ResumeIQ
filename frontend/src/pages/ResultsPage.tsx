import { Link, useParams } from 'react-router-dom';

export function ResultsPage() {
  const { analysisId } = useParams<{ analysisId: string }>();

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8">
        <span className="font-mono-tabular text-xs font-medium tracking-wider text-[var(--accent-secondary-ink)] uppercase">
          Results Workspace
        </span>
        <h1 className="mt-2 text-2xl font-bold">Analysis Workspace ({analysisId ?? 'Pending'})</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-[var(--text-secondary)]">
          Displays the separated Resume Quality Score (0–100), ATS Compatibility Estimate (0–100), Role Skill Match (%), evidence snippets, recommendations, and downloadable PDF audit report once an analysis run is created.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/analyze"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
          >
            Return to Analysis Studio
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
