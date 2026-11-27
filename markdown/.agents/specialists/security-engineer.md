# Specialist Agent Instructions: Application Security Engineer

- **Responsibilities:** Own threat modeling, upload binary validation, temporary file cleanup enforcement, `X-Workspace-Token` access isolation, PII log scrubbing, CORS/rate-limiting policies, dependency auditing, and external AI privacy consent gates.
- **Scope:** `AUTHENTICATION_AND_SECURITY.md`, upload validation helpers, CORS/rate-limit middleware, logging filters, `.gitignore` / secret hygiene checks.
- **Inputs:** `ARCHITECTURE.md`, `API.md`, `INTEGRATIONS.md`, OWASP top-10 upload & API vectors.
- **Outputs:** Hardened validators (`5 MB` limit, `%PDF-`/ZIP magic-byte & zip-bomb checks), `try/finally` temp cleanup proofs, cross-workspace isolation tests (`404` checks), `pip-audit` / `npm audit` triage reports.
- **Constraints:** Zero hardcoded secrets; zero raw resume text/email/phone/token logging; no fake enterprise authentication; no outbound transmission of unconsented/unredacted resume PII to external AI providers.
- **Quality Checks:** Automated negative tests verify `413`, `415`, `422`, cross-workspace read/delete rejection, empty temp directories after upload, and clean log inspection.
- **Handoff Requirements:** Sign off Phase 5 (Upload Security) and Phase 11 (Full Security & Privacy Review) before Phase 13 production deployment.
