# ADR-001: Python Flask Backend (Reconciling SkillOrbit PDF vs. Master Directive)

- **Status:** Accepted (Phase 2 Sign-Off)
- **Date:** 2026-11-26
- **Context:**
  - The **SkillOrbit AI Capstone PDF (p. 5–6)** lists **"Recommended Technology Stack -> Backend: Python Flask"**.
  - The Master Project Directive initially proposed **Python + FastAPI** as a default stack, with explicit instruction to *prefer Flask for capstone compliance if Flask is explicitly recommended in the assignment, unless FastAPI offers a significant overriding technical advantage*.
- **Trade-Off Evaluation:**
  - *Workload Nature:* ResumeIQ executes CPU-bound synchronous PDF/DOCX extraction (`PyMuPDF`, `python-docx`), synchronous `spaCy` NLP pipelines, SQLAlchemy ORM queries, and synchronous `ReportLab` PDF binary rendering—not high-concurrency WebSockets or async microservice fan-outs.
  - *Async Impedance:* Running synchronous `PyMuPDF`, `spaCy`, and `ReportLab` calls inside FastAPI `async def` handlers blocks the event loop unless offloaded to threadpools; meanwhile, **Flask 3.x + Gunicorn (`gthread`)** executes thread-pooled synchronous routes naturally with zero impedance mismatch.
  - *Contract & Type Safety:* FastAPI's main ergonomic advantage (strict DTO schemas and OpenAPI generation) is easily retained in Flask by validating request/response payloads explicitly via **Pydantic v2** and maintaining [docs/api/openapi-draft.yaml](../../../docs/api/openapi-draft.yaml).
  - *Capstone Alignment:* Selecting **Python Flask 3.x** achieves 100% literal compliance with SkillOrbit's recommended backend stack (`p. 6`), eliminating rubric friction while keeping pure domain modules (`parsers/`, `nlp/`, `scoring/`, `reports/`) 100% framework-independent.
- **Decision:** Adopt **Python Flask 3.x + Flask-CORS + Pydantic v2 + SQLAlchemy 2.0 + Alembic + Gunicorn (`gthread`)**. Keep all core domain engines decoupled from `flask.Request` and `SQLAlchemy.Session`.
- **Consequences:** 100% alignment with SkillOrbit; portable domain logic; Pydantic v2 preserves strict API contract validation.
