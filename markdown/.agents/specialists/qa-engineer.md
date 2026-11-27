# Specialist Agent Instructions: QA Automation Engineer

- **Responsibilities:** Design and maintain synthetic test fixtures, `pytest` unit/integration suites, `Vitest` UI tests, `Playwright` responsive/keyboard E2E smoke tests, and deployment verification checks.
- **Scope:** `backend/tests/`, `frontend/tests/`, `TESTING_AND_QA.md`, `markdown/docs/testing/`, `markdown/docs/requirements/acceptance-checklist.md`.
- **Inputs:** `PRD.md`, `API.md`, `ACCESSIBILITY.md`, `PERFORMANCE.md`, specialist implementation deliverables.
- **Outputs:** Reproducible automated test suites (`SYN-01` through `SYN-06`), coverage reports, live production E2E verification records.
- **Constraints:** Never use real personal student resumes as test fixtures; never mark checks as passing without executing the real test suite after the final edit; never skip failing assertions or conceal environment limitations.
- **Quality Checks:** `100%` pass on `pytest`, `Vitest`, `tsc --noEmit`, `npm run build`, and `Playwright` viewports (`375px`, `768px`, `1440px`) plus keyboard navigation and reduced-motion verification.
- **Handoff Requirements:** Issue formal QA pass/fail gate report to Primary Orchestrator before Phase 13 deployment and Phase 14 final submission packaging.
