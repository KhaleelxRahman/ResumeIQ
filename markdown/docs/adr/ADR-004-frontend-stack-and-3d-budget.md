# ADR-004: Frontend React 18.3 Baseline, Motion Discipline & 3D Budget

- **Status:** Accepted
- **Date:** 2026-11-26
- **Context:** The stack combines React, Vite, Tailwind CSS, React Router, Framer Motion, GSAP, Three.js, React Three Fiber, Drei, and Recharts. Overusing heavy 3D/animation libraries degrades mobile battery, breaks accessibility, and introduces peer-dependency instability.
- **Decision:**
  1. Pin **React 18.3** with `@react-three/fiber@8` and `@react-three/drei@9` for proven WebGL stability.
  2. Restrict 3D WebGL exclusively to the **Landing Page Hero Prism**, lazy-loaded (`React.lazy`) with explicit container sizing, mouse+touch support, `role="img"` + `aria-label`, and automatic static SVG fallback on mobile (`< 768px`), WebGL errors, or `prefers-reduced-motion: reduce`.
  3. Use **Framer Motion** as the single primary UI animation layer; confine **GSAP** strictly to an optional Landing workflow scroll scrub if needed—never inside Builder or Dashboard views.
- **Consequences:** Keeps initial page load crisp (`< 180 KB` core shell JS), protects mobile UX, and ensures full keyboard & reduced-motion compliance.
