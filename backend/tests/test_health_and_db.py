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


def test_synthetic_samples_seeded_and_accessible(client):
    resp = client.get("/api/samples")
    assert resp.status_code == 200
    samples = resp.get_json()["samples"]
    assert len(samples) == 2

    sample_id = samples[0]["id"]
    detail = client.get(f"/api/samples/{sample_id}")
    assert detail.status_code == 200
    body = detail.get_json()
    assert body["is_sample"] is True
    assert len(body["sections"]) >= 3
