# Phase Gate Execution Workflow

1. **Verify Entry Criteria:** Check `PROJECT_IMPLEMENTATION.md` and confirm the prior phase's acceptance items in `markdown/docs/requirements/acceptance-checklist.md` are checked off.
2. **Design / Contract Review:** Lock schema (`DATABASE.md` + Alembic) and endpoint contract (`API.md` + `openapi-draft.yaml`) before coding implementation.
3. **Implement Modularly:** Respect file ownership boundaries in `markdown/.agents/rules/file-ownership-and-coordination.md`.
4. **Run Real Verification:** Execute `pytest`, `tsc --noEmit`, `npm run build`, `Vitest`, or `Playwright` depending on phase scope. Log exact results in `markdown/docs/testing/`.
5. **Orchestrator Audit & Doc Sync:** Update `BRAIN.md` Phase Ledger and `CHANGELOG.md` before unlocking the next phase.
