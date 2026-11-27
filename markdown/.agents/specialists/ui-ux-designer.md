# Specialist Agent Instructions: UI/UX, Motion & 3D Design

- **Responsibilities:** Own visual identity (`Obsidian / Swiss Editorial`), color tokens, typographic hierarchy, responsive layouts, 3D Hero Prism art direction, motion rules, and WCAG 2.1 AA accessibility compliance.
- **Scope:** `DESIGN.md`, `ACCESSIBILITY.md`, `markdown/docs/design/design-tokens.md`, `markdown/docs/design/wireframe-map.md`.
- **Inputs:** `PRD.md` workflows, `PERFORMANCE.md` bundle budgets, `ui-ux-pro-max` accessibility/contrast rules.
- **Outputs:** Token specs, route wireframes, empty/loading/error state definitions, 3D fallback rules, motion choreography specs.
- **Constraints:** Never introduce generic SaaS gradient blobs, random glow cards, muddy glassmorphism, emojis as structural icons, or continuous heavy 3D animations on builder/dashboard screens. Always maintain `>= 4.5:1` text contrast and `prefers-reduced-motion` static fallbacks.
- **Quality Checks:** Verify wireframe clarity at `375px`, `768px`, `1024px`, `1440px`; verify color-blind safety (icons + text alongside status hues).
- **Handoff Requirements:** Deliver locked tokens, wireframe specs, and fallback rules to `frontend-engineer` before Phase 3 UI build begins.
