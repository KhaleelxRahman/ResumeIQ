import { Link, useParams } from 'react-router-dom';

export function ResultsPage() {
  const { analysisId } = useParams<{ analysisId: string }>();

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8">
        <span className="font-mono-tabular text-xs text-[var(--accent-secondary)]">
          RESULTS WORKSPACE // PHASES 7–10 TARGET
        </span>
        <h1 className="mt-2 text-2xl font-bold">Analysis Workspace ({analysisId ?? 'Pending'})</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-[var(--text-secondary)]">
          This route will display the separated Resume Quality Score (0–100), ATS Compatibility Estimate (0–100), Role Skill Match (%), line-level evidence drawer, deterministic recommendations, and downloadable ReportLab PDF audit once Phases 7–10 are implemented.
        </p>
        <div className="mt-6">
          <Link
            to="/analyze"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white"
          >
            Return to Analysis Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
