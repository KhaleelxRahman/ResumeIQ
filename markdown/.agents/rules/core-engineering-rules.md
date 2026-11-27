# Core Engineering Rules (All Agents)

1. **Workspace Inspection:** Always read existing target files before proposing or writing edits. Never delete or overwrite active code silently.
2. **Truthfulness & Anti-Fabrication:** Never generate fake test runs, fake ATS guarantees, fabricated skills/metrics, or LLM-invented numeric scores.
3. **Pure Engine Separation:** Keep parsing, NLP, scoring, and ReportLab generation decoupled from Flask HTTP handlers and SQLAlchemy sessions.
4. **Privacy Discipline:** Treat all resume payloads as sensitive PII. Never log raw resume text, phone numbers, emails, or `X-Workspace-Token` headers. Always delete temp uploaded binaries immediately.
5. **Single Canonical Configuration:** Zero duplicate backend/frontend folders or competing token/config files.
6. **Contract Synchronization:** Update `DATABASE.md`, `API.md`, `docs/api/openapi-draft.yaml`, and `CHANGELOG.md` whenever contracts change.
7. **Verification Gate:** Never claim a check or feature passed unless verified by an actual execution output after the final edit.
