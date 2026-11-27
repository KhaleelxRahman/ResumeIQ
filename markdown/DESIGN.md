# DESIGN.md — Visual System, Editorial Layout & 3D/Motion Specification

---

## 1. Aesthetic Direction: **Obsidian / Neo-Futurist / Swiss Editorial**

ResumeIQ looks like a precision career diagnostic instrument—inspired by technical publications, architectural grids, and editorial typography rather than generic bubbly SaaS templates.

### Design Anti-Patterns (Strictly Forbidden)
- Rainbow/neon-purple full-screen gradients.
- Muddy translucent glassmorphism on text-heavy cards.
- Identical rounded-2xl bento cards repeated on every page.
- Decorative pulsing glows, floating emojis used as UI icons, or fake "AI chat" assistant bubbles.
- Stock office/graduation photography replacing genuine product UI previews.

---

## 2. Color Tokens (`WCAG 2.1 AA+`)

| Token | Hex / Value | Role | Contrast Notes |
|---|---|---|---|
| `--bg-canvas` | `#090B10` | Primary viewport background | Base obsidian ground |
| `--bg-surface` | `#11151E` | Primary structural panels & cards | Clear tonal step without blur |
| `--bg-elevated` | `#171D29` | Modals, active tabs, dropdowns, hover layers | Sharp hierarchy separation |
| `--border-hairline` | `rgba(243, 245, 248, 0.09)` | Crisp `1px` Swiss editorial grid dividers | Structural clarity without heavy drop shadows |
| `--border-strong` | `rgba(243, 245, 248, 0.22)` | Inputs, focused containers | Visible affordance |
| `--text-primary` | `#F3F5F8` | Headlines, body copy, primary metrics | `> 16:1` on `#090B10` |
| `--text-secondary` | `#9CA7B8` | Metadata, helper text, axis labels | `> 6.8:1` on `#11151E` |
| `--accent-primary` | `#7C5CFF` | Primary CTA, active step ring, focus halo | Restrained electric violet (text on accent uses `#FFFFFF`, large UI/buttons checked `>= 4.5:1`) |
| `--accent-secondary` | `#38BDF8` | Technical tags, secondary chart series | Ice cyan data accent |
| `--status-success` | `#22C55E` | Matched skills, score ≥ 80 | Always paired with check icon + text label |
| `--status-warning` | `#F59E0B` | Synonym/uncertain match, moderate warnings | Always paired with alert icon + text label |
| `--status-danger` | `#F43F5E` | Missing mandatory skills, critical parse errors | Always paired with cross/warning icon + label |

*Note: Interactive Resume Builder templates render an isolated **Light Paper Preview Sheet (`#FFFFFF` / `#111827`)** inside the dark studio frame so printed PDFs match visual reality accurately.*

---

## 3. Typography & Spatial Grid

- **Display & Body Sans:** `Inter` (`font-display` / `font-sans`)
  - Hero Display: `clamp(2.5rem, 5vw, 4.25rem)`, weight `700`, tracking `-0.03em`, line-height `1.05`.
  - Section H2: `1.75rem–2.25rem`, weight `600`, tracking `-0.02em`.
  - Body Copy: `0.9375rem–1rem` (`15–16px`), weight `400`, line-height `1.6`, readable measure `≤ 68ch`.
- **Technical Monospace:** `JetBrains Mono`
  - Used strictly for tabular KPI numbers (`font-variant-numeric: tabular-nums`), rubric point weights (`14 / 15`), extracted skill chips, and step indexes (`01 // UPLOAD`).
- **Grid Rhythm:** `4px/8px` baseline spacing scale; asymmetric 12-column Swiss editorial grid on desktop (`max-w-[1320px]`), collapsing gracefully to clean single-column flow on tablet (`768px`) and mobile (`375px`).

---

## 4. 3D Hero Concept & Technical Constraints

### Concept: **"The Calibration Prism / Layered Document Lattice"**
Positioned cleanly in the right column of the Landing Hero (never overlapping or obscuring the primary left-column headline and CTA):
- Three crisp, semi-translucent obsidian-and-anodized-metal **resume planes** suspended in calibrated space, intersected by thin geometric scan lines and delicate orbital coordinate ticks that subtly align as the user moves their pointer or touch.
- Represents raw unstructured text transforming into verified structured career intelligence.

### Mandatory Technical Safeguards
1. **Lazy Chunk Loading:** `React.lazy(() => import('../three/HeroPrismCanvas'))` with `<Suspense>` showing an immediate static SVG/CSS wireframe placeholder (zero CLS, fast LCP).
2. **Container Sizing:** Renderer sized strictly to `canvas.clientWidth × canvas.clientHeight` with `dpr={[1, 1.75]}`—never `window.innerWidth`.
3. **Input Parity & Accessibility:** Supports both mouse and `touchstart`/`touchmove` coordinates; sets `role="img"` and descriptive `aria-label` on `<canvas>`.
4. **Automatic Fallback:** Automatically swaps to a crisp static editorial SVG schematic when:
   - `prefers-reduced-motion: reduce` is active,
   - viewport width `< 768px` (protecting mobile battery & FPS), or
   - WebGL context creation fails (`WebGLErrorBoundary`).

---

## 5. Motion Architecture

- **Primary Engine (`Framer Motion`):** Route transitions (`180ms`), animated radial score rings, tabbed layout indicators (`layoutId`), accordion evidence drawers, wrapped globally in `<MotionConfig reducedMotion="user">`.
- **Bounded `GSAP` Usage:** Permitted **only** for a single optional Landing Page "How ResumeIQ Works" scrub sequence if explicitly enabled; completely excluded from Builder, Studio, Dashboard, and History so React state and DOM transforms never collide.
- **No Perpetual Distractions:** Zero infinite bouncing cards or spinning background blobs on analytical screens.

---

## 6. Empty, Loading & Error States

- **Cold-Start Hosting Banner:** Calm status pill showing backend warm-up progress (`GET /api/health` retry) without breaking user forms.
- **Parse Warnings Panel:** Clear amber callout when multi-column PDFs or image-only scans are detected, listing exact next steps.
- **Empty History State:** Editorial empty state inviting users to either build a resume, upload a PDF/DOCX, or load one of the synthetic Demo Samples in 1 click.
