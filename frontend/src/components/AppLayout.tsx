import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/analyze', label: 'Analyze' },
  { to: '/builder', label: 'Builder' },
  { to: '/history', label: 'History' },
  { to: '/about', label: 'Methodology' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-3.5 sm:px-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-[6px] border border-[var(--accent-primary)] bg-[var(--bg-surface)] font-mono-tabular text-[11px] text-[var(--accent-secondary)]">
                IQ
              </span>
              <span>ResumeIQ</span>
            </Link>

            <nav aria-label="Primary Navigation" className="hidden items-center gap-6 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--text-primary)] underline decoration-[var(--accent-primary)] decoration-2 underline-offset-8'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/analyze"
                className="inline-flex min-h-[40px] items-center rounded-lg bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
              >
                Open Studio
              </Link>
            </nav>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] md:hidden"
            >
              {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>

          {mobileOpen && (
            <nav
              aria-label="Mobile Navigation"
              className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 md:hidden"
            >
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          )}
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-6 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[var(--accent-secondary)]" aria-hidden="true" />
              <span>
                Free-first student tool. ATS Compatibility is a deterministic simulation estimate, never an employer guarantee.
              </span>
            </div>
            <span className="font-mono-tabular">ResumeIQ // SkillOrbit Capstone Baseline</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
