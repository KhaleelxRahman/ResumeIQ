from __future__ import annotations

from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

from app.db.seed import seed_core_data
from app.extensions import Base


def test_health_endpoint_reports_ok_and_deterministic_core(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["nlp_ready"] is True
    assert body["hf_mode"] == "disabled"


def test_all_expected_tables_created_and_postgres_ddl_valid(app):
    engine = app.config["DB_ENGINE"]
    table_names = set(inspect(engine).get_table_names())
    expected = {
        "workspaces",
        "resumes",
        "resume_versions",
        "resume_sections",
        "job_roles",
        "role_skills",
        "job_descriptions",
        "analyses",
        "analysis_skill_matches",
        "recommendations",
    }
    assert expected.issubset(table_names)

    # Compile full DDL against PostgreSQL dialect to verify Neon Postgres compatibility.
    pg_dialect = postgresql.dialect()
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=pg_dialect))
        assert table.name in ddl
        for idx in table.indexes:
            idx_ddl = str(CreateIndex(idx).compile(dialect=pg_dialect))
            assert idx.name in idx_ddl


def test_four_mandatory_skillorbit_roles_seeded_and_idempotent(client, db_session):
    counts_again = seed_core_data(db_session)
    assert counts_again == {"roles_created": 0, "skills_created": 0, "samples_created": 0}

    resp = client.get("/api/job-roles")
    assert resp.status_code == 200
    roles = resp.get_json()["roles"]
    slugs = {r["slug"]: r for r in roles}
    assert set(slugs.keys()) == {"data-analyst", "web-developer", "ai-engineer", "cloud-engineer"}
    for role in roles:
        assert role["is_core_mandatory"] is True
        assert role["mandatory_count"] >= 6
        assert role["preferred_count"] >= 6

    detail_resp = client.get("/api/job-roles/data-analyst")
    assert detail_resp.status_code == 200
    detail = detail_resp.get_json()
    skill_keys = {s["canonical_key"] for s in detail["skills"]}
    assert {"sql", "python", "pandas", "excel"}.issubset(skill_keys)


def test_synthetic_samples_seeded_and_accessible(client, db_session):
    resp = client.get("/api/samples")
    assert resp.status_code == 200
    samples = resp.get_json()["samples"]
    assert len(samples) == 2

    by_title = {s["title"]: s for s in samples}
    web_sample = by_title["Synthetic Fresher Sample — Web Developer"]
    data_sample = by_title["Synthetic Fresher Sample — Data Analyst"]

    web_detail = client.get(f"/api/samples/{web_sample['id']}")
    assert web_detail.status_code == 200
    web_body = web_detail.get_json()
    assert web_body["is_sample"] is True
    assert len(web_body["sections"]) >= 3
    assert {"Python", "JavaScript", "TypeScript", "React", "Flask", "SQL", "PostgreSQL"}.issubset(
        set(web_body["skills"])
    )
    assert "Java" not in web_body["skills"]
    assert web_body["masked_contact"]["email"] == "s***@example.edu"
    assert web_body["masked_contact"]["phone"] == "***-***-0001"
    assert web_body["masked_contact"]["github"] == "github.com/s***"
    assert web_body["masked_contact"]["linkedin"] == "linkedin.com/in/s***"
    assert "synthetic-a" not in str(web_body["masked_contact"])

    # Verify /api/resumes/<sample_id> matches UI preview contract with canonical skills & masked URLs
    token = client.post("/api/workspaces/session").get_json()["token"]
    preview = client.get(
        f"/api/resumes/{data_sample['id']}",
        headers={"X-Workspace-Token": token},
    )
    assert preview.status_code == 200
    preview_ver = preview.get_json()["version"]
    data_skills = preview_ver["structured_payload"]["skills"]
    assert len(data_skills) == len(set(data_skills))
    assert {"Python", "SQL", "R", "Pandas", "NumPy", "Power BI", "Statistics"}.issubset(set(data_skills))
    assert preview_ver["contact_flags"]["has_linkedin"] is False
    assert preview_ver["masked_contact"]["github"] == "github.com/s***"
    assert "synthetic-b" not in str(preview_ver["masked_contact"])

    # Simulate pre-P0 legacy sample record missing skills, then verify seed_core_data backfills without duplicating
    from uuid import UUID
    from sqlalchemy import select
    from app.models.entities import Resume, ResumeVersion

    web_ver = db_session.scalar(select(ResumeVersion).where(ResumeVersion.resume_id == UUID(web_sample["id"])))
    assert web_ver is not None
    web_ver.structured_payload_json = {"sections": web_body["sections"]}
    web_ver.masked_contact_json = {"email": "synthetic.***@example.edu"}
    db_session.commit()

    counts = seed_core_data(db_session)
    assert counts == {"roles_created": 0, "skills_created": 0, "samples_created": 0}
    db_session.expire_all()

    after = client.get(f"/api/samples/{web_sample['id']}").get_json()
    assert {"Python", "JavaScript", "React"}.issubset(set(after["skills"]))
    assert len(after["skills"]) == len(set(after["skills"]))
    assert after["masked_contact"]["github"] == "github.com/s***"
    assert len(db_session.scalars(select(Resume).where(Resume.is_sample.is_(True))).all()) == 2
