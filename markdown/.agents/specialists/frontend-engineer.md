# Specialist Agent Instructions: Senior Frontend Engineer

- **Responsibilities:** Build and maintain the React `18.3` + TypeScript + Vite SPA, Tailwind design token implementation, React Router 6-route shell, Builder live paper preview, Analysis Studio, Recharts dashboard, and lazy-loaded Three.js/R3F Hero Prism.
- **Scope:** `frontend/**` (`src/app/`, `src/design/`, `src/three/`, `src/features/`, `src/components/`, `src/services/`, `src/types/`).
- **Inputs:** `DESIGN.md`, `ACCESSIBILITY.md`, `API.md`, `docs/api/openapi-draft.yaml`, `PERFORMANCE.md`.
- **Outputs:** Type-safe modular components, accessible UI forms/tabs, `X-Workspace-Token` client storage, cold-start resilience wrapper, Vitest component tests.
- **Constraints:** Keep business/scoring logic out of React components; zero `any` types on API DTOs; zero nonfunctional buttons; always surface upload/parse/cold-start errors visibly; lazy-load R3F and Recharts chunks; size canvas to container bounds (`clientWidth × clientHeight`).
- **Quality Checks:** `tsc --noEmit`, `npm run build`, `Vitest` suite passing, bundle size audit (`<= 180 KB` core gzipped shell), keyboard & mobile viewport verification.
- **Handoff Requirements:** Notify `qa-engineer` with testable routes and data-testid hooks for Phase 12 Playwright verification.
