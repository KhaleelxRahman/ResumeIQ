from __future__ import annotations

import io
from uuid import UUID

from sqlalchemy import func, select

from app.models.entities import Resume, ResumeSection, ResumeVersion
from app.parsers.entities import extract_structured_resume_entities
from app.parsers.pdf_parser import parse_pdf_document
from app.parsers.sectioner import segment_resume_sections
from app.parsers.storage import ephemeral_upload_path


def _issue_token(client) -> str:
    resp = client.post("/api/workspaces/session")
    assert resp.status_code == 201
    return resp.get_json()["token"]


def _sample_builder_payload(template_slug: str = "swiss-technical") -> dict:
    return {
        "title": "Synthetic Fresher Portfolio",
        "template_slug": template_slug,
        "contact": {
            "full_name": "Aarav Synthetic",
            "email": "aarav.builder@example.edu",
            "phone": "+91-9811122233",
            "location": "Bengaluru, IN",
            "github": "github.com/aarav-builder",
            "linkedin": "linkedin.com/in/aarav-builder",
            "portfolio": "https://portfolio.aarav.example.dev",
        },
        "sections": [
            {
                "section_type": "summary",
                "raw_heading": "SUMMARY",
                "content_text": (
                    "Computer science undergraduate building reliable Flask APIs, PostgreSQL schemas, "
                    "and accessible React applications with automated regression suites."
                ),
            },
            {
                "section_type": "education",
                "raw_heading": "EDUCATION",
                "content_text": "B.Tech in Computer Science, Example Institute of Technology (2023 - 2027) | CGPA: 8.8/10",
            },
            {
                "section_type": "skills",
                "raw_heading": "TECHNICAL SKILLS",
                "content_text": (
                    "Languages: Python, C++, TypeScript, JavaScript, SQL\n"
                    "Frameworks & Tools: Flask, React, PostgreSQL, Docker, Git, C++ & REST APIs"
                ),
            },
            {
                "section_type": "projects",
                "raw_heading": "PROJECTS",
                "content_text": (
                    "Campus Shuttle Tracker | Python, Flask, React, PostgreSQL\n"
                    "- Built REST endpoints & deterministic schedule validation (<100ms response).\n"
                    "- Implemented automated Pytest verification suites and CI checks.\n\n"
                    "Student Budget Ledger | TypeScript, React, SQLite\n"
                    "- Designed keyboard-accessible expense ledger and CSV report exports."
                ),
            },
            {
                "section_type": "certifications",
                "raw_heading": "CERTIFICATIONS",
                "content_text": "Cloud Fundamentals & Linux Automation (Synthetic Coursework)",
            },
        ],
    }


def test_builder_create_draft_patch_versioning_and_ownership(client, db_session):
    token_a = _issue_token(client)
    token_b = _issue_token(client)
    headers_a = {"X-Workspace-Token": token_a}
    headers_b = {"X-Workspace-Token": token_b}

    # Reject unknown extra fields such as structured_payload
    bad_payload = _sample_builder_payload()
    bad_payload["structured_payload"] = {"skills": ["Forged"]}
    bad_resp = client.post("/api/resumes/builder", json=bad_payload, headers=headers_a)
    assert bad_resp.status_code == 400
    assert bad_resp.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # Create v1 draft
    create_resp = client.post("/api/resumes/builder", json=_sample_builder_payload("swiss-technical"), headers=headers_a)
    assert create_resp.status_code == 201
    created = create_resp.get_json()
    resume_id = created["id"]
    v1_id = created["version"]["version_id"]

    assert created["source_type"] == "builder"
    assert created["version"]["version_number"] == 1
    assert created["version"]["template_slug"] == "swiss-technical"
    assert len(created["versions"]) == 1
    assert {"Python", "C++", "TypeScript", "JavaScript", "SQL", "Flask", "React", "PostgreSQL"}.issubset(
        set(created["version"]["structured_payload"]["skills"])
    )
    assert created["version"]["masked_contact"]["github"] == "github.com/a***"
    assert "aarav-builder" not in str(created["version"]["masked_contact"])

    # Update active draft v1 in place via PATCH (switches template + adds Go to skills)
    updated_sections = list(_sample_builder_payload()["sections"])
    updated_sections[2] = {
        **updated_sections[2],
        "content_text": updated_sections[2]["content_text"] + ", Go",
    }
    patch_payload = {
        "title": "Synthetic Fresher Portfolio Updated",
        "template_slug": "academic-editorial",
        "contact": _sample_builder_payload()["contact"],
        "sections": [
            *updated_sections,
            {
                "section_type": "achievements",
                "raw_heading": "ACHIEVEMENTS",
                "content_text": "Top 10 finalist in Campus Hackathon (2026).",
            },
        ],
    }
    patch_resp = client.patch(f"/api/resumes/{resume_id}/versions/{v1_id}", json=patch_payload, headers=headers_a)
    assert patch_resp.status_code == 200
    patched = patch_resp.get_json()
    assert patched["title"] == "Synthetic Fresher Portfolio Updated"
    assert patched["version"]["template_slug"] == "academic-editorial"
    assert "Go" in patched["version"]["structured_payload"]["skills"]

    # Save immutable new version v2
    v2_payload = _sample_builder_payload("academic-editorial")
    v2_payload["title"] = "Synthetic Fresher Portfolio v2"
    v2_payload["sections"][2]["content_text"] += ", Kubernetes"
    v2_resp = client.post(f"/api/resumes/{resume_id}/versions", json=v2_payload, headers=headers_a)
    assert v2_resp.status_code == 201
    v2_data = v2_resp.get_json()
    v2_id = v2_data["version"]["version_id"]
    assert v2_id != v1_id
    assert v2_data["version"]["version_number"] == 2
    assert v2_data["active_version_id"] == v2_id
    assert [v["version_number"] for v in v2_data["versions"]] == [1, 2]
    assert "Kubernetes" in v2_data["version"]["structured_payload"]["skills"]

    # Querying historical v1 snapshot still returns v1 intact
    v1_hist = client.get(f"/api/resumes/{resume_id}?version_id={v1_id}", headers=headers_a)
    assert v1_hist.status_code == 200
    assert v1_hist.get_json()["version"]["version_number"] == 1
    assert "Kubernetes" not in v1_hist.get_json()["version"]["structured_payload"]["skills"]

    # Workspace B cannot view, snapshot, or export Workspace A resume
    assert client.get(f"/api/resumes/{resume_id}", headers=headers_b).status_code == 404
    assert client.post(f"/api/resumes/{resume_id}/versions", json=v2_payload, headers=headers_b).status_code == 404
    assert (
        client.get(f"/api/resumes/{resume_id}/versions/{v2_id}/export?format=pdf", headers=headers_b).status_code == 404
    )

    # Deferred DOCX export rejected cleanly
    docx_resp = client.get(f"/api/resumes/{resume_id}/versions/{v2_id}/export?format=docx", headers=headers_a)
    assert docx_resp.status_code == 400
    assert docx_resp.get_json()["error"]["code"] == "FORMAT_DEFERRED"

    # Deleting resume cascades cleanly across all versions and sections
    del_resp = client.delete(f"/api/resumes/{resume_id}", headers=headers_a)
    assert del_resp.status_code == 204
    assert db_session.scalar(select(Resume).where(Resume.id == UUID(resume_id))) is None
    assert db_session.scalar(select(func.count(ResumeVersion.id)).where(ResumeVersion.resume_id == UUID(resume_id))) == 0
    assert (
        db_session.scalar(
            select(func.count(ResumeSection.id)).where(ResumeSection.resume_version_id.in_([UUID(v1_id), UUID(v2_id)]))
        )
        == 0
    )


def test_exported_builder_pdfs_self_parse_cleanly_for_both_templates(client):
    token = _issue_token(client)
    headers = {"X-Workspace-Token": token}

    for slug in ("swiss-technical", "academic-editorial"):
        payload = _sample_builder_payload(slug)
        create_resp = client.post("/api/resumes/builder", json=payload, headers=headers)
        assert create_resp.status_code == 201
        created = create_resp.get_json()
        resume_id = created["id"]
        version_id = created["version"]["version_id"]

        export_resp = client.get(
            f"/api/resumes/{resume_id}/versions/{version_id}/export?format=pdf",
            headers=headers,
        )
        assert export_resp.status_code == 200
        assert export_resp.mimetype == "application/pdf"
        assert "attachment;" in export_resp.headers["Content-Disposition"]
        assert ".pdf" in export_resp.headers["Content-Disposition"]

        pdf_bytes = export_resp.data
        assert pdf_bytes.startswith(b"%PDF-")

        # 1) Direct pure-domain parser self-parse validation
        with ephemeral_upload_path("pdf", writer=lambda path: path.write_bytes(pdf_bytes)) as tmp_pdf:
            parsed = parse_pdf_document(tmp_pdf)

        assert parsed.layout_penalty == 0.0
        warning_codes = {w.code for w in parsed.warnings}
        assert "MULTI_COLUMN_LAYOUT" not in warning_codes

        segmented = segment_resume_sections(parsed.raw_text)
        entities = extract_structured_resume_entities(
            raw_text=parsed.raw_text,
            sections=segmented,
            base_warnings=parsed.warnings,
            layout_penalty=parsed.layout_penalty,
        )
        assert entities.extraction_confidence >= 0.95
        assert entities.contact_flags["has_email"] is True
        assert entities.contact_flags["has_phone"] is True
        assert entities.contact_flags["has_github"] is True
        assert entities.contact_flags["has_linkedin"] is True
        assert {"Python", "C++", "TypeScript", "JavaScript", "SQL", "Flask", "React", "PostgreSQL"}.issubset(
            set(entities.structured_payload["skills"])
        )

        # 2) Full HTTP re-upload round-trip via POST /api/resumes/upload
        reupload = client.post(
            "/api/resumes/upload",
            data={"file": (io.BytesIO(pdf_bytes), f"{slug}.pdf"), "title": f"SelfParse-{slug}"},
            content_type="multipart/form-data",
            headers=headers,
        )
        assert reupload.status_code == 201
        reuploaded = reupload.get_json()["version"]
        assert reuploaded["extraction_confidence"] >= 0.95
        assert not any(w["code"] == "MULTI_COLUMN_LAYOUT" for w in reuploaded["parse_warnings"])
        sec_types = [s["section_type"] for s in reuploaded["sections"]]
        assert {"header_contact", "summary", "education", "skills", "projects", "certifications"}.issubset(set(sec_types))
