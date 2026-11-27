# MCP_CONNECTIONS.md — MCP Server & Plugin Inventory

> Audited on **2026-11-26** using `list_plugin_accounts` and local plugin directory inspection (`C:\Users\KhaleelLocal\.gemini\config\plugins`). Per policy, no absent MCP servers are assumed.

---

## 1. Audited Plugin & MCP Status

| Plugin / MCP Identifier | Installation State | Authentication / Readiness | Intended Use for ResumeIQ |
|---|---|---|---|
| `agentic-bundle-essentials` | Installed (local skills) | Ready (no external auth needed) | Systematic debugging, TDD, lint-validate, git-pushing guidance. |
| `chrome-devtools-plugin` | Installed (skills/browser subagent) | Ready | Phase 12 UI visual/a11y/performance debugging (`375px`/`768px`/`1440px`, LCP, focus checks). |
| `coderabbit` (`coderabbit_coderabbit`) | Installed | **Waiting for user sign-in** | Automated PR/local code review once user authenticates via Plugins Manager. |
| `netlify` (`netlify_netlify`) | Installed | **Waiting for user sign-in** | Alternative static frontend hosting if Netlify is chosen over Vercel. |
| `sentry` (`sentry_sentry`) | Installed | **Waiting for user sign-in** | Optional error telemetry setup (strictly PII-scrubbed) if user authenticates. |
| `supabase` (`supabase_mcp`) | Installed | **Waiting for user sign-in** | Potential managed PostgreSQL host if user connects Supabase; zero runtime assumption yet. |

---

## 2. Absent MCP Servers (Explicitly Not Connected)

The following tools have **no active MCP servers** configured in this environment:
- **GitHub MCP** — Use standard local `git` CLI (`git version 2.56.1` verified) and authenticated GitHub remote workflow.
- **Hugging Face MCP** — Use official Python libraries / verified HTTP APIs in Phase 9 only if enabled.
- **Vercel MCP / Render MCP** — Deploy via standard CLI or web dashboard + Git push hooks.

---

## 3. Operational Policy

- Never attempt to connect unauthenticated MCP tools silently or fabricate MCP tool outputs.
- Request user sign-in only when a plugin's MCP server is actually required for a deployment or telemetry task.
