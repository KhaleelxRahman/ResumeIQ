# CONTRIBUTING.md — Contribution Standards & Review Workflow

---

## 1. Branching & Commit Discipline

- **`main`:** Always stable, passing tests, synchronized with documentation.
- **Feature Branches:** `feat/<phase>-<short-name>`, `fix/<issue>`, `docs/<topic>`.
- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

---

## 2. Pull Request & Change Checklist

Before merging any feature or bug fix:
- [ ] Pure domain logic (`parsers`, `nlp`, `scoring`) remains decoupled from HTTP and DB code.
- [ ] All schema or API modifications include matching updates to `DATABASE.md` / `API.md` / `docs/api/openapi-draft.yaml` and Alembic migrations.
- [ ] Unit and integration tests added with synthetic fixtures (zero personal resumes or secrets).
- [ ] Tests executed *after* final edit (`pytest`, `npm run build`, `vitest`) with real passing output.
- [ ] Responsive layout and keyboard focus checked for any UI changes.
- [ ] `CHANGELOG.md` updated for user-facing or architectural milestones.
