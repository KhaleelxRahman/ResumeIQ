export function AboutPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      <span className="font-mono-tabular text-xs text-[var(--accent-secondary)]">
        TRANSPARENCY, PRIVACY &amp; METHODOLOGY
      </span>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">How ResumeIQ Evaluates Resumes</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-[var(--text-secondary)]">
        ResumeIQ implements deterministic, explainable career evaluation aligned with the SkillOrbit AI Capstone specification—with zero deep learning black boxes, zero fabricated claims, and explicit separation between Quality Score, ATS Estimate, and Skill Match.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
          <h2 className="mb-3 text-base font-semibold">100-Point Deterministic Quality Weights</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex justify-between"><span>Resume Structure &amp; Readability</span><span className="font-mono-tabular text-[var(--text-primary)]">20 pts</span></li>
            <li className="flex justify-between"><span>Skills Section &amp; Calibration</span><span className="font-mono-tabular text-[var(--text-primary)]">20 pts</span></li>
            <li className="flex justify-between"><span>Education Details</span><span className="font-mono-tabular text-[var(--text-primary)]">15 pts</span></li>
            <li className="flex justify-between"><span>Projects Section</span><span className="font-mono-tabular text-[var(--text-primary)]">15 pts</span></li>
            <li className="flex justify-between"><span>Contact Information</span><span className="font-mono-tabular text-[var(--text-primary)]">10 pts</span></li>
            <li className="flex justify-between"><span>Completeness, Experience &amp; Achievements</span><span className="font-mono-tabular text-[var(--text-primary)]">20 pts</span></li>
          </ul>
          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            Student fairness: When evaluating freshers with zero formal corporate experience, internship weight reallocates automatically to technical project depth and hackathons.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
          <h2 className="mb-3 text-base font-semibold">Privacy, Retention &amp; Deletion Policy</h2>
          <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
            <li><strong className="text-[var(--text-primary)]">Uploaded Files:</strong> Deleted immediately in a guaranteed cleanup block once text extraction finishes (0 seconds permanent binary retention).</li>
            <li><strong className="text-[var(--text-primary)]">Workspace Isolation:</strong> Scoped to a 256-bit server-issued session token stored solely as a SHA-256 hash.</li>
            <li><strong className="text-[var(--text-primary)]">Right to Purge:</strong> Delete individual resumes or purge your entire workspace session at any time via cascade deletion.</li>
            <li><strong className="text-[var(--text-primary)]">ATS Estimate Disclaimer:</strong> ATS scores simulate standard parser heuristics and never guarantee passing an employer&apos;s specific ATS.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
