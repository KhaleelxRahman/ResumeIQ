from __future__ import annotations

import io
import tempfile
import uuid
import zipfile
from pathlib import Path

import pymupdf as fitz
from docx import Document
from sqlalchemy import select

from app.models.entities import Resume, ResumeSection, ResumeVersion


def _make_pdf_bytes(lines: list[str], encrypt_password: str | None = None) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    y = 60
    for line in lines:
        page.insert_text((50, y), line, fontsize=11)
        y += 18
    if encrypt_password:
        buf = doc.tobytes(
            encryption=fitz.PDF_ENCRYPT_AES_128,
            user_pw=encrypt_password,
            owner_pw=encrypt_password,
        )
    else:
        buf = doc.tobytes()
    doc.close()
    return buf


def _make_two_column_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((50, 55), "Aarav TwoCol | aarav.col@example.edu | +91-9000012345", fontsize=12)
    # Left column blocks (x < 280)
    page.insert_text((45, 110), "TECHNICAL SKILLS", fontsize=11)
    page.insert_text((45, 130), "Python, SQL, Go, C++, React.js", fontsize=10)
    page.insert_text((45, 180), "EDUCATION", fontsize=11)
    page.insert_text((45, 200), "B.Tech CS, Example Univ (2023-2027)", fontsize=10)
    # Right column blocks (x > 320, vertically overlapping left column)
    page.insert_text((330, 110), "PROJECTS", fontsize=11)
    page.insert_text((330, 130), "Campus Transit Tracker using Flask and Postgres", fontsize=10)
    page.insert_text((330, 180), "INTERNSHIPS", fontsize=11)
    page.insert_text((330, 200), "Software Intern at Example Labs (2025)", fontsize=10)
    buf = doc.tobytes()
    doc.close()
    return buf


def _make_scanned_image_pdf_bytes() -> bytes:
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 120, 120), False)
    pix.clear_with(240)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(fitz.Rect(50, 50, 450, 650), pixmap=pix)
    buf = doc.tobytes()
    doc.close()
    return buf


def _make_docx_bytes(with_table: bool = True, header_contact: bool = True) -> bytes:
    doc = Document()
    if header_contact:
        doc.sections[0].header.paragraphs[0].text = "Diya Header | diya.header@example.edu | +91-9000099999"
    else:
        doc.add_paragraph("Diya Body")
        doc.add_paragraph("diya.body@example.edu | +91-9000088888 | github.com/diya-synth")

    doc.add_paragraph("SUMMARY")
    doc.add_paragraph("Final-year engineering student focused on backend APIs and data analytics.")

    doc.add_paragraph("EDUCATION")
    doc.add_paragraph("B.Tech Information Technology, Synthetic Institute (2022 - 2026) | CGPA: 8.8")

    if with_table:
        doc.add_paragraph("SKILLS")
        table = doc.add_table(rows=2, cols=2)
        table.cell(0, 0).text = "Languages"
        table.cell(0, 1).text = "Python, SQL, C#, JavaScript"
        table.cell(1, 0).text = "Frameworks & Tools"
        table.cell(1, 1).text = "Flask, React.js, PostgreSQL, Docker, CI/CD"

    doc.add_paragraph("PROJECTS")
    doc.add_paragraph("Inventory Forecast Dashboard — Built ETL and forecasting pipelines in Python and SQL.")

    doc.add_paragraph("CERTIFICATIONS")
    doc.add_paragraph("Cloud Fundamentals Certificate (Coursework)")

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


def _issue_token(client) -> str:
    resp = client.post("/api/workspaces/session")
    assert resp.status_code == 201
    return resp.get_json()["token"]


def _count_resumeiq_temp_dirs() -> int:
    tmp_root = Path(tempfile.gettempdir())
    return sum(1 for p in tmp_root.glob("resumeiq_upload_*") if p.is_dir())


def test_pdf_upload_extraction_preserves_evidence_and_cleans_temp(client):
    token = _issue_token(client)
    pdf_bytes = _make_pdf_bytes(
        [
            "Rohan Synthetic",
            "rohan.synth@example.edu | +91-9811122233 | github.com/rohan-s | linkedin.com/in/rohan-s",
            "SUMMARY",
            "Computer science undergraduate building reliable Python and React applications.",
            "EDUCATION",
            "B.Tech Computer Science, Example College (2023 - 2027)",
            "TECHNICAL SKILLS",
            "Languages: Python, C++, Go, JavaScript, SQL",
            "Tools: React.js, Flask, PostgreSQL, Git",
            "PROJECTS",
            "Campus Bus Tracker - Built REST API and live map using Flask and React.",
            "INTERNSHIPS",
            "Backend Intern at Synthetic Systems (May 2025 - Jul 2025)",
            "EXPERIENCE",
            "Undergraduate Teaching Assistant - Data Structures Lab",
            "CERTIFICATIONS",
            "Python Data Structures Certificate",
        ]
    )

    before_tmp = _count_resumeiq_temp_dirs()
    resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(pdf_bytes), "rohan_resume.pdf")},
        content_type="multipart/form-data",
    )
    after_tmp = _count_resumeiq_temp_dirs()

    assert resp.status_code == 201
    assert after_tmp == before_tmp

    body = resp.get_json()
    assert body["source_type"] == "upload_pdf"
    ver = body["version"]
    assert ver["candidate_label"] == "Rohan Synthetic"
    assert ver["contact_flags"]["has_email"] is True
    assert ver["contact_flags"]["has_phone"] is True
    assert ver["contact_flags"]["has_github"] is True
    assert ver["contact_flags"]["has_linkedin"] is True
    assert ver["masked_contact"]["email"] == "r***@example.edu"
    assert ver["masked_contact"]["phone"] == "***-***-2233"
    assert ver["masked_contact"]["github"] == "github.com/r***"
    assert ver["masked_contact"]["linkedin"] == "linkedin.com/in/r***"
    assert "rohan-s" not in str(ver["masked_contact"])
    assert ver["extraction_confidence"] >= 0.85

    sec_types = {s["section_type"] for s in ver["sections"]}
    assert {"summary", "education", "skills", "projects", "internships", "experience", "certifications"}.issubset(
        sec_types
    )
    skills = set(ver["structured_payload"]["skills"])
    assert {"Python", "C++", "Go", "JavaScript", "SQL", "React", "Flask"}.issubset(skills)
    assert "Rohan Synthetic" in ver["raw_text"]


def test_docx_table_and_header_extraction_with_warnings(client):
    token = _issue_token(client)
    docx_bytes = _make_docx_bytes(with_table=True, header_contact=True)

    resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(docx_bytes), "diya_tables.docx")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201
    ver = resp.get_json()["version"]
    warning_codes = {w["code"] for w in ver["parse_warnings"]}
    assert "TABLE_LAYOUT_DETECTED" in warning_codes
    assert "HEADER_FOOTER_CONTACT_ONLY" in warning_codes
    skills = set(ver["structured_payload"]["skills"])
    assert {"Python", "SQL", "C#", "JavaScript", "Flask", "React", "CI/CD"}.issubset(skills)


def test_missing_sections_are_not_invented(client):
    token = _issue_token(client)
    minimal_pdf = _make_pdf_bytes(
        [
            "Minimal Candidate",
            "minimal@example.edu",
            "EDUCATION",
            "B.Sc Computer Science, Example University (2024 - 2027)",
        ]
    )

    resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(minimal_pdf), "minimal.pdf")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201
    ver = resp.get_json()["version"]
    payload = ver["structured_payload"]
    assert payload["projects"] == []
    assert payload["experience"] == []
    assert payload["internships"] == []
    assert payload["certifications"] == []
    warning_codes = {w["code"] for w in ver["parse_warnings"]}
    assert "MISSING_STANDARD_SECTIONS" in warning_codes
    assert "LOW_WORD_COUNT" in warning_codes


def test_two_column_pdf_emits_layout_warning_and_preserves_columns(client):
    token = _issue_token(client)
    two_col_pdf = _make_two_column_pdf_bytes()

    resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(two_col_pdf), "two_col.pdf")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201
    ver = resp.get_json()["version"]
    warning_codes = {w["code"] for w in ver["parse_warnings"]}
    assert "MULTI_COLUMN_LAYOUT" in warning_codes
    assert "TECHNICAL SKILLS" in ver["raw_text"]
    assert "PROJECTS" in ver["raw_text"]


def test_scanned_and_encrypted_pdfs_rejected_honestly(client):
    token = _issue_token(client)

    scanned_bytes = _make_scanned_image_pdf_bytes()
    scanned_resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(scanned_bytes), "scanned.pdf")},
        content_type="multipart/form-data",
    )
    assert scanned_resp.status_code == 422
    assert scanned_resp.get_json()["error"]["code"] == "SCANNED_PDF_DETECTED"

    encrypted_bytes = _make_pdf_bytes(["Secret Resume Content"], encrypt_password="pass")
    enc_resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(encrypted_bytes), "locked.pdf")},
        content_type="multipart/form-data",
    )
    assert enc_resp.status_code == 422
    assert enc_resp.get_json()["error"]["code"] == "ENCRYPTED_DOCUMENT_UNSUPPORTED"


def test_malformed_spoofed_oversized_and_zipbomb_uploads_rejected_and_temp_cleaned(client):
    token = _issue_token(client)
    before_tmp = _count_resumeiq_temp_dirs()

    # 1. Unsupported extension
    r_txt = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(b"hello world"), "notes.txt")},
        content_type="multipart/form-data",
    )
    assert r_txt.status_code == 415

    # 2. Empty file
    r_empty = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(b""), "empty.pdf")},
        content_type="multipart/form-data",
    )
    assert r_empty.status_code == 422
    assert r_empty.get_json()["error"]["code"] == "EMPTY_DOCUMENT"

    # 3. Spoofed PDF extension
    r_spoof = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(b"MZ_NOT_A_PDF_EXECUTABLE"), "spoof.pdf")},
        content_type="multipart/form-data",
    )
    assert r_spoof.status_code == 415
    assert r_spoof.get_json()["error"]["code"] == "INVALID_FILE_SIGNATURE"

    # 4. Corrupted PDF header
    r_corrupt_pdf = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(b"%PDF-1.7\n%corrupted_stream"), "broken.pdf")},
        content_type="multipart/form-data",
    )
    assert r_corrupt_pdf.status_code == 422
    assert r_corrupt_pdf.get_json()["error"]["code"] == "CORRUPTED_DOCUMENT"

    # 5. Plain ZIP missing word/document.xml disguised as .docx
    zip_no_word = io.BytesIO()
    with zipfile.ZipFile(zip_no_word, "w") as zf:
        zf.writestr("readme.txt", "not a docx")
    r_no_ooxml = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(zip_no_word.getvalue()), "fake.docx")},
        content_type="multipart/form-data",
    )
    assert r_no_ooxml.status_code == 415
    assert r_no_ooxml.get_json()["error"]["code"] == "INVALID_OOXML_DOCUMENT"

    # 6. Macro-enabled DOCX archive blocked
    zip_macro = io.BytesIO()
    with zipfile.ZipFile(zip_macro, "w") as zf:
        zf.writestr("word/document.xml", "<w:document/>")
        zf.writestr("word/vbaProject.bin", "macro")
    r_macro = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(zip_macro.getvalue()), "macro.docx")},
        content_type="multipart/form-data",
    )
    assert r_macro.status_code == 415
    assert r_macro.get_json()["error"]["code"] == "MACRO_ENABLED_DOCUMENT_UNSUPPORTED"

    # 7. Path traversal inside DOCX ZIP rejected
    zip_traversal = io.BytesIO()
    with zipfile.ZipFile(zip_traversal, "w") as zf:
        zf.writestr("word/document.xml", "<w:document/>")
        zf.writestr("../evil.xml", "bad")
    r_trav = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(zip_traversal.getvalue()), "trav.docx")},
        content_type="multipart/form-data",
    )
    assert r_trav.status_code == 422
    assert r_trav.get_json()["error"]["code"] == "CORRUPTED_OR_UNSAFE_DOCUMENT"

    # 8. ZIP-bomb (> 25 MB uncompressed highly-compressed XML) rejected
    zip_bomb = io.BytesIO()
    with zipfile.ZipFile(zip_bomb, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", "A" * (26 * 1024 * 1024))
    r_bomb = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(zip_bomb.getvalue()), "bomb.docx")},
        content_type="multipart/form-data",
    )
    assert r_bomb.status_code == 422
    assert r_bomb.get_json()["error"]["code"] == "ZIP_BOMB_DETECTED"

    # 9. Oversized (> 5 MB) payload rejected with 413
    oversized = b"%PDF-1.7\n" + (b"0" * (5 * 1024 * 1024 + 512))
    r_big = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(oversized), "huge.pdf")},
        content_type="multipart/form-data",
    )
    assert r_big.status_code == 413
    assert r_big.get_json()["error"]["code"] == "FILE_TOO_LARGE"

    assert _count_resumeiq_temp_dirs() == before_tmp


def test_editable_parse_preview_ownership_and_cascade_deletion(client, db_session):
    token_a = _issue_token(client)
    token_b = _issue_token(client)

    pdf_bytes = _make_pdf_bytes(
        [
            "Ananya Owner",
            "ananya@example.edu | +91-9123456789",
            "EDUCATION",
            "B.E. Computer Science, Example University (2023 - 2027)",
            "SKILLS",
            "Python, SQL, Flask, HTML, CSS",
            "PROJECTS",
            "Notes App - Built CRUD backend with Flask and SQLite.",
        ]
    )
    upload_resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token_a},
        data={"file": (io.BytesIO(pdf_bytes), "ananya.pdf")},
        content_type="multipart/form-data",
    )
    assert upload_resp.status_code == 201
    created = upload_resp.get_json()
    resume_id = created["id"]
    version_id = created["version"]["version_id"]
    original_raw_text = created["version"]["raw_text"]

    # Workspace B cannot read, update, or delete Workspace A's resume
    assert client.get(f"/api/resumes/{resume_id}", headers={"X-Workspace-Token": token_b}).status_code == 404
    assert (
        client.patch(
            f"/api/resumes/{resume_id}/versions/{version_id}",
            headers={"X-Workspace-Token": token_b},
            json={"candidate_label": "Hijacked"},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/resumes/{resume_id}", headers={"X-Workspace-Token": token_b}).status_code == 404

    # Workspace A cannot mutate read-only synthetic sample
    sample_id = client.get("/api/samples").get_json()["samples"][0]["id"]
    sample_detail = client.get(f"/api/resumes/{sample_id}", headers={"X-Workspace-Token": token_a})
    assert sample_detail.status_code == 200
    sample_ver_id = sample_detail.get_json()["version"]["version_id"]
    assert (
        client.patch(
            f"/api/resumes/{sample_id}/versions/{sample_ver_id}",
            headers={"X-Workspace-Token": token_a},
            json={"title": "Mutated Sample"},
        ).status_code
        == 403
    )

    # Workspace A edits parsed sections while preserving original extracted raw_text
    patch_resp = client.patch(
        f"/api/resumes/{resume_id}/versions/{version_id}",
        headers={"X-Workspace-Token": token_a},
        json={
            "title": "Ananya Revised Resume",
            "candidate_label": "Ananya S.",
            "sections": [
                {
                    "section_type": "education",
                    "raw_heading": "EDUCATION",
                    "content_text": "B.E. Computer Science, Example University (2023 - 2027) | CGPA 8.9",
                },
                {
                    "section_type": "skills",
                    "raw_heading": "TECHNICAL SKILLS",
                    "content_text": "Python, SQL, Flask, HTML, CSS",
                },
            ],
        },
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.get_json()
    assert patched["title"] == "Ananya Revised Resume"
    assert patched["version"]["candidate_label"] == "Ananya S."
    assert patched["version"]["raw_text"] == original_raw_text
    assert patched["version"]["structured_payload"]["user_edited"] is True
    assert len(patched["version"]["sections"]) == 2

    # List resumes returns Workspace A's resume
    list_resp = client.get("/api/resumes?include_samples=false", headers={"X-Workspace-Token": token_a})
    assert list_resp.status_code == 200
    assert len(list_resp.get_json()["resumes"]) == 1

    # Owner deletes resume -> cascades versions & sections cleanly
    del_resp = client.delete(f"/api/resumes/{resume_id}", headers={"X-Workspace-Token": token_a})
    assert del_resp.status_code == 204
    assert client.get(f"/api/resumes/{resume_id}", headers={"X-Workspace-Token": token_a}).status_code == 404
    resume_uuid = uuid.UUID(resume_id)
    version_uuid = uuid.UUID(version_id)
    assert db_session.scalar(select(Resume).where(Resume.id == resume_uuid)) is None
    assert db_session.scalar(select(ResumeVersion).where(ResumeVersion.id == version_uuid)) is None
    assert db_session.scalars(select(ResumeSection).where(ResumeSection.resume_version_id == version_uuid)).all() == []


def test_patch_blocks_structured_payload_override_and_recalculates_derived_fields(client):
    token = _issue_token(client)
    pdf_bytes = _make_pdf_bytes(
        [
            "Kiran Candidate",
            "kiran@example.edu | github.com/kiran-dev",
            "SKILLS",
            "Python, SQL",
            "PROJECTS",
            "Budget CLI - Simple budget tracker in Python.",
        ]
    )
    created = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(pdf_bytes), "kiran.pdf")},
        content_type="multipart/form-data",
    ).get_json()
    resume_id = created["id"]
    version_id = created["version"]["version_id"]
    original_raw_text = created["version"]["raw_text"]
    original_word_count = created["version"]["word_count"]

    # 1. Arbitrary client-supplied structured_payload override must be rejected with 400
    forged_patch = client.patch(
        f"/api/resumes/{resume_id}/versions/{version_id}",
        headers={"X-Workspace-Token": token},
        json={
            "title": "Override Attempt",
            "structured_payload": {"skills": ["InventedSkill", "Kubernetes"], "page_count": 99},
        },
    )
    assert forged_patch.status_code == 400
    assert forged_patch.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # 2. Editing sections recalculates skills, word_count, contact_flags, and masked_contact while keeping raw_text intact
    edited_resp = client.patch(
        f"/api/resumes/{resume_id}/versions/{version_id}",
        headers={"X-Workspace-Token": token},
        json={
            "sections": [
                {
                    "section_type": "header_contact",
                    "raw_heading": "HEADER",
                    "content_text": (
                        "Kiran Candidate\n"
                        "kiran.updated@example.edu | +91-9876543210 | "
                        "linkedin.com/in/kiran-secret-profile | github.com/kiran-secret-git | "
                        "https://portfolio.kiran-sharma.dev/projects"
                    ),
                },
                {
                    "section_type": "skills",
                    "raw_heading": "TECHNICAL SKILLS",
                    "content_text": "Python, SQL, Docker, Kubernetes, C++, Go",
                },
                {
                    "section_type": "projects",
                    "raw_heading": "PROJECTS",
                    "content_text": "Containerized API - Deployed Docker microservices using Flask and PostgreSQL.",
                },
            ]
        },
    )
    assert edited_resp.status_code == 200
    ver = edited_resp.get_json()["version"]

    assert ver["raw_text"] == original_raw_text
    assert ver["word_count"] > original_word_count
    assert ver["structured_payload"]["user_edited"] is True
    assert ver["structured_payload"]["page_count"] == 1
    assert {"Python", "SQL", "Docker", "Kubernetes", "C++", "Go", "Flask", "PostgreSQL"}.issubset(
        set(ver["structured_payload"]["skills"])
    )
    assert ver["contact_flags"] == {
        "has_email": True,
        "has_phone": True,
        "has_linkedin": True,
        "has_github": True,
        "has_portfolio": True,
    }
    assert ver["masked_contact"]["email"] == "k***@example.edu"
    assert ver["masked_contact"]["phone"] == "***-***-3210"
    assert ver["masked_contact"]["linkedin"] == "linkedin.com/in/k***"
    assert ver["masked_contact"]["github"] == "github.com/k***"
    assert ver["masked_contact"]["portfolio"] == "p***.k***.dev/***"
    masked_serialized = str(ver["masked_contact"])
    assert "kiran-secret-profile" not in masked_serialized
    assert "kiran-secret-git" not in masked_serialized
    assert "kiran-sharma" not in masked_serialized
    assert "/projects" not in masked_serialized


def test_exact_5mb_multipart_upload_succeeds_and_5mb_plus_one_fails(client):
    token = _issue_token(client)
    base_pdf = _make_pdf_bytes(
        [
            "Priya ExactLimit",
            "priya@example.edu | github.com/priya-p",
            "EDUCATION",
            "B.Tech CS, Example Univ (2023 - 2027)",
            "SKILLS",
            "Python, SQL, Flask, Docker",
        ]
    )
    exact_5mb = 5 * 1024 * 1024
    pad_needed = exact_5mb - len(base_pdf)
    assert pad_needed > 20
    # Valid trailing PDF comment padding keeps PDF valid at exactly 5,242,880 bytes while HTTP multipart body > 5 MiB.
    padded_exact_5mb = base_pdf + b"\n%" + (b"a" * (pad_needed - 2))
    assert len(padded_exact_5mb) == exact_5mb

    ok_resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(padded_exact_5mb), "exact_5mb.pdf"), "title": "Boundary 5MB"},
        content_type="multipart/form-data",
    )
    assert ok_resp.status_code == 201
    assert ok_resp.get_json()["version"]["file_size_bytes"] == exact_5mb

    too_big = padded_exact_5mb + b"x"
    over_resp = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(too_big), "over_5mb.pdf")},
        content_type="multipart/form-data",
    )
    assert over_resp.status_code == 413
    assert over_resp.get_json()["error"]["code"] == "FILE_TOO_LARGE"


def test_small_ratio_zip_bomb_xxe_disguised_mime_and_vector_pdf(client):
    token = _issue_token(client)

    # 1. Small (< 1 MB) high-ratio ZIP bomb inside .docx (e.g. 600 KB zeros -> ~600 bytes compressed)
    small_bomb = io.BytesIO()
    with zipfile.ZipFile(small_bomb, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", "A" * (600 * 1024))
    r_small_bomb = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(small_bomb.getvalue()), "small_bomb.docx")},
        content_type="multipart/form-data",
    )
    assert r_small_bomb.status_code == 422
    assert r_small_bomb.get_json()["error"]["code"] == "ZIP_BOMB_DETECTED"

    # 2. Multi-entry compressed bomb (30 x 900 KB entries = ~27 MB > 25 MB cumulative ceiling)
    multi_bomb = io.BytesIO()
    with zipfile.ZipFile(multi_bomb, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", "<w:document/>")
        for i in range(30):
            zf.writestr(f"word/part_{i}.bin", b"X" * (900 * 1024))
    r_multi = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(multi_bomb.getvalue()), "multi_bomb.docx")},
        content_type="multipart/form-data",
    )
    assert r_multi.status_code == 422
    assert r_multi.get_json()["error"]["code"] == "ZIP_BOMB_DETECTED"

    # 3. Spoofed central-directory/local-header size rejected cleanly before python-docx
    import struct
    raw_zip = bytearray(small_bomb.getvalue())
    lfh_idx = raw_zip.find(b"PK\x03\x04")
    cd_idx = raw_zip.find(b"PK\x01\x02")
    assert lfh_idx != -1 and cd_idx != -1
    struct.pack_into("<I", raw_zip, lfh_idx + 22, 64)
    struct.pack_into("<I", raw_zip, cd_idx + 24, 64)
    r_spoof_hdr = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(bytes(raw_zip)), "spoof_cd.docx")},
        content_type="multipart/form-data",
    )
    assert r_spoof_hdr.status_code == 422
    assert r_spoof_hdr.get_json()["error"]["code"] in {"CORRUPTED_DOCUMENT", "ZIP_BOMB_DETECTED"}

    # 3. XML DOCTYPE / ENTITY expansion bomb inside word/document.xml
    xxe_docx = io.BytesIO()
    with zipfile.ZipFile(xxe_docx, "w") as zf:
        zf.writestr("word/document.xml", '<!DOCTYPE lolz [<!ENTITY lol "lol">]><w:document/>')
    r_xxe = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(xxe_docx.getvalue()), "xxe.docx")},
        content_type="multipart/form-data",
    )
    assert r_xxe.status_code == 422
    assert r_xxe.get_json()["error"]["code"] == "CORRUPTED_OR_UNSAFE_DOCUMENT"

    # 4. Disguised DOCX renamed to .pdf even with client Content-Type: application/pdf
    from werkzeug.datastructures import FileStorage
    real_docx = _make_docx_bytes(with_table=False, header_contact=False)
    r_docx_as_pdf = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(real_docx), "fake.pdf", "application/pdf")},
        content_type="multipart/form-data",
    )
    assert r_docx_as_pdf.status_code == 415
    assert r_docx_as_pdf.get_json()["error"]["code"] == "INVALID_FILE_SIGNATURE"

    # 5. Disguised PNG renamed to .pdf even with Content-Type: application/pdf
    png_bytes = b"\x89PNG\r\n\x1a\n" + (b"\x00" * 64)
    r_png_as_pdf = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(png_bytes), "photo.pdf", "application/pdf")},
        content_type="multipart/form-data",
    )
    assert r_png_as_pdf.status_code == 415
    assert r_png_as_pdf.get_json()["error"]["code"] == "INVALID_FILE_SIGNATURE"

    # 6. Valid PDF sent with application/octet-stream MIME succeeds via binary inspection
    valid_pdf = _make_pdf_bytes(
        [
            "Stream Octet",
            "octet@example.edu",
            "EDUCATION",
            "B.Tech CS (2023 - 2027)",
            "SKILLS",
            "Python, SQL, Docker, Git",
        ]
    )
    r_octet = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(valid_pdf), "octet.pdf", "application/octet-stream")},
        content_type="multipart/form-data",
    )
    assert r_octet.status_code == 201

    # 7. Vector-outlined PDF (drawings >= 15, images == 0, chars == 0) emits SCANNED_PDF_DETECTED
    vec_doc = fitz.open()
    vec_page = vec_doc.new_page()
    for i in range(20):
        vec_page.draw_rect(fitz.Rect(40, 40 + i * 25, 240, 55 + i * 25))
    vec_bytes = vec_doc.tobytes()
    vec_doc.close()

    r_vec = client.post(
        "/api/resumes/upload",
        headers={"X-Workspace-Token": token},
        data={"file": (io.BytesIO(vec_bytes), "outlined_canva.pdf")},
        content_type="multipart/form-data",
    )
    assert r_vec.status_code == 422
    assert r_vec.get_json()["error"]["code"] == "SCANNED_PDF_DETECTED"
    assert r_vec.get_json()["error"]["details"]["vector_drawings"] >= 15
