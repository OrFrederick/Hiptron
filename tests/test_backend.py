from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


@pytest.fixture(scope="module")
def populated_db(tmp_path_factory) -> Path:
    db_path = tmp_path_factory.mktemp("api") / "api.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def test_older_adult_home_returns_cards(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/older-adult/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "greeting" in body
    assert "yesterday_walk" in body
    assert "schematic_map" in body
    assert "streak_days" in body


def test_relative_home_returns_status(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in {"green", "amber"}
    assert "weekly_trend" in body


def test_relative_insights_detail(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/insights", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "blocks" in body
    assert isinstance(body["blocks"], list)
