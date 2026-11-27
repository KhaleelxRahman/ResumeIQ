# Design Tokens Specification (`Obsidian / Swiss Editorial`)

---

## 1. CSS Custom Properties (`frontend/src/styles/tokens.css` target)

```css
:root {
  /* Core Surfaces */
  --bg-canvas: #090b10;
  --bg-surface: #11151e;
  --bg-elevated: #171d29;
  --bg-paper: #ffffff;

  /* Hairlines & Borders */
  --border-hairline: rgba(243, 245, 248, 0.09);
  --border-strong: rgba(243, 245, 248, 0.22);

  /* Typography Ink */
  --text-primary: #f3f5f8;
  --text-secondary: #9ca7b8;
  --text-muted: #6e7a8c;
  --text-paper-ink: #111827;

  /* Brand & Data Accents */
  --accent-primary: #7c5cff;
  --accent-primary-hover: #6c47ff;
  --accent-secondary: #38bdf8;

  /* Semantic Status */
  --status-success: #22c55e;
  --status-warning: #f59e0b;
  --status-danger: #f43f5e;

  /* Typography Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  /* Radii & Spacing Rhythm */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --space-unit: 8px;
}
```

## 2. Motion Tokens

- `DURATION_FAST = 0.15` (hover/button/tab snap)
- `DURATION_BASE = 0.24` (drawer/card enter)
- `DURATION_GAUGE = 0.70` (score ring counter)
- `EASE_EDITORIAL = [0.22, 1, 0.36, 1]`
