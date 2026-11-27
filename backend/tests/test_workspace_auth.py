from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app import create_app
from app.api.auth_workspace import (
    ApiError,
    assert_workspace_ownership,
    hash_workspace_token,
    purge_expired_workspaces,
)
from app.models.entities import Resume, ResumeSection, ResumeVersion, Workspace


def test_server_issues_hashed_token_and_rejects_arbitrary_client_tokens(client, db_session):
    # Missing token rejected
    missing = client.get("/api/workspaces/current")
    assert missing.status_code == 401
    assert missing.get_json()["error"]["code"] == "WORKSPACE_TOKEN_REQUIRED"

    # Arbitrary client-invented token rejected (never accepted as auth)
    forged = client.get(
        "/api/workspaces/current",
        headers={"X-Workspace-Token": "forged-client-token-1234567890123456789012345"},
    )
    assert forged.status_code == 401
    assert forged.get_json()["error"]["code"] == "WORKSPACE_TOKEN_INVALID"

    # Valid server-issued token succeeds and stores ONLY SHA-256 hash in DB
    issued = client.post("/api/workspaces/session")
    assert issued.status_code == 201
    data = issued.get_json()
    raw_token = data["token"]
    assert len(raw_token) >= 40

    ws_row = db_session.scalar(select(Workspace).where(Workspace.token_hash == hash_workspace_token(raw_token)))
    assert ws_row is not None
    assert ws_row.token_hash != raw_token

    current = client.get("/api/workspaces/current", headers={"X-Workspace-Token": raw_token})
    assert current.status_code == 200
    assert current.get_json()["workspace_id"] == data["workspace_id"]


def test_expired_workspace_token_rejected(client, db_session):
    issued = client.post("/api/workspaces/session")
    raw_token = issued.get_json()["token"]
    ws_row = db_session.scalar(select(Workspace).where(Workspace.token_hash == hash_workspace_token(raw_token)))
    ws_row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    resp = client.get("/api/workspaces/current", headers={"X-Workspace-Token": raw_token})
    assert resp.status_code == 401
    assert resp.get_json()["error"]["code"] == "WORKSPACE_TOKEN_EXPIRED"


def test_workspace_purge_cascades_owned_resumes_and_versions(client, db_session):
    issued = client.post("/api/workspaces/session").get_json()
    raw_token = issued["token"]
    ws = db_session.scalar(select(Workspace).where(Workspace.token_hash == hash_workspace_token(raw_token)))

    resume = Resume(workspace_id=ws.id, source_type="builder", is_sample=False, title="Owned Draft")
    db_session.add(resume)
    db_session.flush()
    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        raw_text="Python SQL Flask",
        word_count=3,
    )
    db_session.add(version)
    db_session.commit()

    delete_resp = client.delete("/api/workspaces/current", headers={"X-Workspace-Token": raw_token})
    assert delete_resp.status_code == 204

    # Token is now invalid and child resume/version rows are cascade-deleted.
    assert client.get("/api/workspaces/current", headers={"X-Workspace-Token": raw_token}).status_code == 401
    assert db_session.scalar(select(Resume).where(Resume.id == resume.id)) is None
    assert db_session.scalar(select(ResumeVersion).where(ResumeVersion.id == version.id)) is None


def test_cross_workspace_ownership_rejected_and_sample_mutations_blocked(client, db_session):
    ws_a_resp = client.post("/api/workspaces/session").get_json()
    ws_b_resp = client.post("/api/workspaces/session").get_json()
    ws_a = db_session.scalar(select(Workspace).where(Workspace.token_hash == hash_workspace_token(ws_a_resp["token"])))
    ws_b = db_session.scalar(select(Workspace).where(Workspace.token_hash == hash_workspace_token(ws_b_resp["token"])))

    # Owner A succeeds
    assert_workspace_ownership(ws_a.id, ws_a, "Resume")

    # Workspace B attempting to access Workspace A's resource raises 404 (no existence leak)
    with pytest.raises(ApiError) as exc_cross:
        assert_workspace_ownership(ws_a.id, ws_b, "Resume")
    assert exc_cross.value.status_code == 404

    # Synthetic sample allows read when allow_shared_sample=True, blocks mutation (403)
    assert_workspace_ownership(None, ws_b, "Resume", allow_shared_sample=True, is_sample=True)
    with pytest.raises(ApiError) as exc_sample:
        assert_workspace_ownership(None, ws_b, "Resume", allow_shared_sample=False, is_sample=True)
    assert exc_sample.value.status_code == 403


def test_expired_workspace_purge_cascades_and_preserves_active(client, db_session):
    expired_token = client.post("/api/workspaces/session").get_json()["token"]
    active_token = client.post("/api/workspaces/session").get_json()["token"]

    expired_ws = db_session.scalar(
        select(Workspace).where(Workspace.token_hash == hash_workspace_token(expired_token))
    )
    active_ws = db_session.scalar(
        select(Workspace).where(Workspace.token_hash == hash_workspace_token(active_token))
    )
    assert expired_ws is not None and active_ws is not None

    expired_ws.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)

    exp_res = Resume(workspace_id=expired_ws.id, source_type="upload_pdf", is_sample=False, title="Expired")
    act_res = Resume(workspace_id=active_ws.id, source_type="upload_pdf", is_sample=False, title="Active")
    db_session.add_all([exp_res, act_res])
    db_session.flush()
    exp_ver = ResumeVersion(resume_id=exp_res.id, version_number=1, raw_text="old resume", word_count=2)
    act_ver = ResumeVersion(resume_id=act_res.id, version_number=1, raw_text="fresh resume", word_count=2)
    db_session.add_all([exp_ver, act_ver])
    db_session.flush()
    exp_sec = ResumeSection(
        resume_version_id=exp_ver.id,
        section_type="summary",
        raw_heading="SUMMARY",
        content_text="old",
        order_index=0,
    )
    db_session.add(exp_sec)
    db_session.commit()

    deleted_count = purge_expired_workspaces(db_session)
    db_session.commit()
    assert deleted_count == 1

    assert db_session.scalar(select(Workspace).where(Workspace.id == expired_ws.id)) is None
    assert db_session.scalar(select(Resume).where(Resume.id == exp_res.id)) is None
    assert db_session.scalar(select(ResumeVersion).where(ResumeVersion.id == exp_ver.id)) is None
    assert db_session.scalar(select(ResumeSection).where(ResumeSection.id == exp_sec.id)) is None
    assert db_session.scalar(select(Workspace).where(Workspace.id == active_ws.id)) is not None
    assert db_session.scalar(select(Resume).where(Resume.id == act_res.id)) is not None


def test_rate_limiting_and_workspace_resume_quota_enforced():
    import io
    import pymupdf as fitz

    limited_app = create_app(
        {
            "TESTING": True,
            "DATABASE_URL": "sqlite:///:memory:",
            "CREATE_TABLES_ON_INIT": True,
            "AUTO_SEED_CORE": False,
            "RATE_LIMIT_ENABLED": True,
            "RATE_LIMIT_SESSION_PER_MIN": 2,
            "RATE_LIMIT_UPLOAD_PER_MIN": 3,
            "MAX_RESUMES_PER_WORKSPACE": 1,
        }
    )
    try:
        c = limited_app.test_client()
        s1 = c.post("/api/workspaces/session")
        s2 = c.post("/api/workspaces/session")
        s3 = c.post("/api/workspaces/session")
        assert s1.status_code == 201
        assert s2.status_code == 201
        assert s3.status_code == 429
        assert s3.get_json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in s3.headers

        token = s1.get_json()["token"]
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 60), "Rohan Test\nrohan@example.edu\nEDUCATION\nB.Tech Computer Science 2027\nSKILLS\nPython SQL", fontsize=11)
        pdf_bytes = doc.tobytes()
        doc.close()

        u1 = c.post(
            "/api/resumes/upload",
            headers={"X-Workspace-Token": token},
            data={"file": (io.BytesIO(pdf_bytes), "first.pdf")},
            content_type="multipart/form-data",
        )
        assert u1.status_code == 201

        # Second resume exceeds MAX_RESUMES_PER_WORKSPACE=1
        u2 = c.post(
            "/api/resumes/upload",
            headers={"X-Workspace-Token": token},
            data={"file": (io.BytesIO(pdf_bytes), "second.pdf")},
            content_type="multipart/form-data",
        )
        assert u2.status_code == 429
        assert u2.get_json()["error"]["code"] == "WORKSPACE_QUOTA_EXCEEDED"
    finally:
        limited_app.config["DB_ENGINE"].dispose()
