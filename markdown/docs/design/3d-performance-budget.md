# Phase 3 — 3D & Motion Performance Budget Review

**Reviewed By:** UI/UX Designer, Creative 3D Designer, Senior Frontend Engineer  
**Target Stack:** React `18.3`, `three`, `@react-three/fiber@8`, `@react-three/drei@9`, `framer-motion`

---

## 1. Why a Strict 3D Budget Matters

A student visiting ResumeIQ to upload or check a resume cares first about **speed, readability, and actionable clarity**—not waiting for a 2 MB 3D model to boot. Unchecked WebGL scenes cause mobile battery drain, blown initial JS bundles, WebGL context loss crashes, and blocked CTAs.

---

## 2. Quantitative Hardware & Asset Budgets

| Constraint | Hard Ceiling | Implementation Control |
|---|---|---|
| **Scope of WebGL Usage** | **1 route only** (`/` Landing Hero right column) | Zero `<Canvas>` mounted on `/builder`, `/analyze`, `/results/:id`, `/history`, `/about`. |
| **Scene Complexity** | `<= 6,000` triangles, `<= 12` draw calls | Pure procedural Three.js geometries (3 obsidian beveled resume planes + thin calibration frame + wireframe scan grid). Zero external `.glb`/`.gltf` network fetches, zero high-res environment HDRIs (`Environment`), zero shadow maps (`castShadow=false`), zero post-processing bloom passes. |
| **DPR & Antialias** | `dpr={[1, 1.75]}` | Caps Retina 3x/4x fill-rate overhead on laptops and tablets. |
| **Bundle Isolation** | Core shell `<= 180 KB` gzipped | `React.lazy(() => import('../three/HeroPrismCanvas'))` isolates `three` + `R3F` into an async chunk loaded *after* primary hero text/CTA paints. |
| **LCP & CLS Guard** | `LCP < 2.5s`, `CLS < 0.05` | Hero container reserves fixed `min-height: 420px` aspect box containing an immediate crisp SVG Calibration Prism placeholder before R3F hydrates. |
| **Lifecycle & Battery** | `0%` GPU idle cost offscreen/hidden | Pause `useFrame` updates when `document.hidden === true` or when Hero scrolls out of viewport (`IntersectionObserver`). Dispose geometries and materials cleanly on unmount. |

---

## 3. Mandatory Fallback & Accessibility Matrix

The static editorial SVG/CSS Calibration Prism renders **automatically instead of WebGL** whenever ANY of the following hold:
1. **`prefers-reduced-motion: reduce`** is active (OS/browser accessibility setting).
2. **Mobile / Small Tablet viewport (`< 768px`)** — preserves cellular bandwidth, battery, and touch scrolling responsiveness.
3. **WebGL unavailable or context lost** — caught cleanly via React `WebGLErrorBoundary` + `webglcontextlost` listener.

### Interactive & Screen Reader Parity
- `<canvas>` carries `role="img"` and `aria-label="Interactive 3D illustration of layered resume planes aligning into structured career metrics."`
- Supports both mouse pointer tilt and `touchstart` / `touchmove` (`passive: false` on canvas area only) when rendered on touch-enabled tablets/laptops.
- Primary Hero CTA buttons sit in the **left 6-column editorial block**, completely separated from the right 6-column canvas area so 3D never obscures or intercepts clicks.

---

## 4. Motion Library Boundary (`Framer Motion` vs. `GSAP`)
- **Primary UI Motion:** `framer-motion` wrapped globally in `<MotionConfig reducedMotion="user">` handles page transitions (`180ms`), tab underlines, accordion drawers, and score counters.
- **GSAP Boundary:** Not loaded in core workspace/builder bundles; permitted only on Landing workflow steps if a single subtle scroll sequence is desired, with mandatory `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` guard and full `.revert()` cleanup.
