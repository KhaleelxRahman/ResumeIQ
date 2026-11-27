import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Layers } from 'lucide-react';
import { fetchHealth, fetchJobRoles } from '../services/apiClient';
import type { HealthResponse, JobRoleSummary } from '../types/api';
import { HeroVisualStage } from '../three/HeroVisualStage';

export function LandingPage() {
  const [roles, setRoles] = useState<JobRoleSummary[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchHealth(), fetchJobRoles()]).then(([healthRes, rolesRes]) => {
      if (!active) return;
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      } else {
        setApiNotice('Backend API unavailable; retry when server is ready.');
      }
      if (rolesRes.status === 'fulfilled') {
        setRoles(rolesRes.value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:py-16">
      <section className="grid items-center gap-10 border-b border-[var(--border-hairline)] pb-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1.5 font-mono-tabular text-xs text-[var(--accent-secondary)]">
            <span>01 // STUDENT-FIRST CAREER INTELLIGENCE</span>
            {health && <span className="text-[var(--status-success)]">API READY</span>}
          </div>

          <h1 className="mb-5 text-4xl font-bold tracking-[-0.03em] leading-[1.05] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            Build ATS-ready resumes. Inspect every score down to the line.
          </h1>

          <p className="mb-7 max-w-[60ch] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Upload a PDF/DOCX or build from an ATS-safe editorial template. Receive a transparent 100-point Resume Quality Score, an ATS Compatibility Estimate, and evidence-backed role skill gaps—without fake AI or invented achievements.
          </p>

          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              to="/analyze"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
            >
              <span>Open Analysis Studio</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/builder"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <FileText size={16} aria-hidden="true" />
              <span>Open Resume Builder</span>
            </Link>
          </div>

          <p className="border-l-2 border-[var(--accent-primary)] pl-3 text-xs text-[var(--text-secondary)]">
            Honest evaluation policy: ATS Compatibility is a deterministic simulation estimate, never a guarantee of employer selection. Raw uploaded binaries are deleted immediately after parsing.
          </p>
        </div>

        <div className="lg:col-span-5">
          <HeroVisualStage />
        </div>
      </section>

      <section aria-label="Three Separate Metrics" className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--border-hairline)] md:grid-cols-3">
        <article className="bg-[var(--bg-surface)] p-6">
          <div className="mb-2 font-mono-tabular text-xs text-[var(--accent-secondary)]">METRIC 01 // QUALITY (0-100)</div>
          <h2 className="mb-2 text-lg font-semibold">Student-Fair Structural Audit</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Scores Structure, Skills, Education, Projects, Contact, and Completeness—substituting project depth cleanly for students without prior full-time experience.
          </p>
        </article>
        <article className="bg-[var(--bg-surface)] p-6">
          <div className="mb-2 font-mono-tabular text-xs text-[var(--accent-secondary)]">METRIC 02 // ATS ESTIMATE (0-100)</div>
          <h2 className="mb-2 text-lg font-semibold">ATS Compatibility Estimate</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Simulation estimating parseability, multi-column layout warnings, standard headings, and role keyword coverage. Never conflated with Quality Score.
          </p>
        </article>
        <article className="bg-[var(--bg-surface)] p-6">
          <div className="mb-2 font-mono-tabular text-xs text-[var(--accent-secondary)]">METRIC 03 // ROLE MATCH (%)</div>
          <h2 className="mb-2 text-lg font-semibold">Evidence-Backed Skill Gaps</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Punctuation-safe detection (C, C++, C#, R, Go, JavaScript) showing matched, synonym-inferred, and not-detected keywords with exact text evidence.
          </p>
        </article>
      </section>

      <section aria-label="Core Target Roles" className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Layers size={18} className="text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Mandatory Career Target Taxonomies</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Seeded directly from the Flask API database alongside Custom Job Description matching.
            </p>
          </div>
          {apiNotice && (
            <span role="status" className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--status-warning)]">
              {apiNotice}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.length > 0 ? (
            roles.map((role) => (
              <article
                key={role.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between font-mono-tabular text-[11px] text-[var(--accent-secondary)]">
                    <span>{role.category}</span>
                    <CheckCircle2 size={14} className="text-[var(--status-success)]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{role.title}</h3>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{role.description}</p>
                </div>
                <div className="mt-4 border-t border-[var(--border-hairline)] pt-3 font-mono-tabular text-xs text-[var(--text-secondary)]">
                  {role.mandatory_count} mandatory / {role.preferred_count} preferred
                </div>
              </article>
            ))
          ) : (
            ['Data Analyst', 'Web Developer', 'AI Engineer', 'Cloud Engineer'].map((fallbackTitle) => (
              <article
                key={fallbackTitle}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
              >
                <div className="mb-2 font-mono-tabular text-[11px] text-[var(--text-muted)]">CORE ROLE</div>
                <h3 className="text-base font-semibold">{fallbackTitle}</h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Role taxonomy loads from the ResumeIQ API.</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
