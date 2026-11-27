# Feature Implementation Workflow

1. **Product Alignment:** Verify feature exists in `PRD.md` and respects `SYSTEM_INSTRUCTIONS.md` (no fake AI/scores/fabricated claims).
2. **Schema & Migration (`database-architect`):** Add/alter SQLAlchemy model + Alembic revision if persisted.
3. **Domain Engine (`ai-nlp-engineer` / `backend-engineer`):** Implement pure framework-free logic + unit tests.
4. **API & Security (`backend-engineer` / `security-engineer`):** Wire Pydantic DTOs, `X-Workspace-Token` scope, validation, and integration tests.
5. **Frontend & A11y (`frontend-engineer` / `ui-ux-designer`):** Build typed service call, responsive Obsidian UI, loading/error/empty states, keyboard & reduced-motion support.
6. **QA Sign-Off (`qa-engineer`):** Run regression suite across backend & frontend; confirm zero broken buttons or unverified claims.
