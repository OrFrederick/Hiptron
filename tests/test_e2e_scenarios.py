# tests/test_e2e_scenarios.py
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import SCENARIOS


@pytest.fixture(scope="module")
def demo_db(tmp_path_factory) -> Path:
    """One DB seeded with all four personas, run through the full pipeline."""
    db_path = tmp_path_factory.mktemp("demo") / "demo.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    for scn in SCENARIOS.values():
        generate(scn, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def _changepoint_features(db_path: Path, user_id: str) -> set[str]:
    ro = open_db(db_path, read_only=True)
    rows = ro.execute(
        "SELECT DISTINCT feature FROM changepoints WHERE user_id = ?", (user_id,)
    ).fetchall()
    ro.close()
    return {r[0] for r in rows}


def test_all_personas_have_daily_features(demo_db: Path):
    ro = open_db(demo_db, read_only=True)
    counts = dict(
        ro.execute("SELECT user_id, count(*) FROM daily_features GROUP BY user_id").fetchall()
    )
    ro.close()
    assert set(counts) == {"helga", "otto", "margarete", "ingrid"}
    assert all(c > 0 for c in counts.values())


def test_helga_signature_is_distance_decline(demo_db: Path):
    assert "total_distance_m" in _changepoint_features(demo_db, "helga")


def test_otto_signature_is_place_repertoire(demo_db: Path):
    assert "place_count" in _changepoint_features(demo_db, "otto")


def test_margarete_signature_is_outing_frequency(demo_db: Path):
    assert "n_outings" in _changepoint_features(demo_db, "margarete")


def test_ingrid_is_all_clear(demo_db: Path):
    # Healthy control: no relative alert -> green status.
    client = TestClient(create_app(demo_db))
    body = client.get("/api/relative/home", params={"user_id": "ingrid"}).json()
    assert body["status"] == "green"
    # Older-adult home shows a reassurance trend card, never empty.
    oa = client.get("/api/older-adult/home", params={"user_id": "ingrid"}).json()
    assert oa["trend_card"]


def test_cross_user_isolation(demo_db: Path):
    # ingrid must not inherit helga's decline changepoint.
    assert "total_distance_m" not in _changepoint_features(demo_db, "ingrid")


def test_insights_detail_uses_persona_name(demo_db: Path):
    client = TestClient(create_app(demo_db))
    body = client.get("/api/relative/insights", params={"user_id": "otto"}).json()
    questions = " ".join(b["question"] for b in body["blocks"])
    assert "Otto" in questions
    # The retired fatigue block is gone; outings block is present.
    features = {b.get("feature") for b in body["blocks"]}
    assert "n_outings" in features
    assert "fatigue_index" not in features
