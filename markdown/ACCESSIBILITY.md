# ACCESSIBILITY.md — WCAG 2.1 AA Compliance & Inclusive Design

---

## 1. Core Accessibility Standards

ResumeIQ targets **WCAG 2.1 Level AA** across all routes (`/` Landing, `/builder`, `/analyze`, `/results/:id`, `/history`, `/about`).

---

## 2. Mandatory UI & Interaction Rules

1. **Color & Non-Color Semantics:**
   - Normal body text contrast `>= 4.5:1` (`#F3F5F8` and `#9CA7B8` against `#090B10`/`#11151E`); large UI boundaries `>= 3:1`.
   - Status badges (`Matched`, `Synonym`, `Missing`, `Uncertain`) always pair color with distinct Lucide icons and explicit text labels—never color alone.
2. **Keyboard Navigation & Focus:**
   - Every upload zone, builder accordion, tab list (`role="tablist"`), skill filter chip, and evidence drawer is 100% keyboard operable (`Tab`, `Enter`, `Space`, `Arrow` keys).
   - Never suppress focus rings (`outline: none`); apply visible `2px` high-contrast focus halos (`focus-visible`).
   - Include a **"Skip to main content"** link on every layout.
3. **Screen Reader Semantics:**
   - Dynamic upload progress, parsing errors, and analysis completion states announce via `aria-live="polite"` / `role="alert"`.
   - All data charts include accessible summaries or tabular data toggles so screen reader users can read exact numbers.
   - **3D WebGL Canvas:** Explicitly attach `role="img"` and descriptive `aria-label` (or `aria-hidden="true"` when decorative alongside adjacent text) so `<canvas>` is never an opaque mystery node.
4. **Reduced Motion (`prefers-reduced-motion`):**
   - Wrap Framer Motion in `<MotionConfig reducedMotion="user">`.
   - When `prefers-reduced-motion: reduce` is true, disable WebGL rotation/particles and GSAP scroll animations immediately, rendering crisp static final states with zero blocking transitions.
5. **Touch Targets & Responsive Zoom:**
   - Minimum interactive button/chip hit areas `44×44px` on mobile/tablet; verify clean reflow at `375px`, `768px`, `1024px`, and `1440px` without horizontal overflow or disabled pinch-zoom.
