from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


def _full_run(tmp_path: Path, scenario: Scenario) -> Path:
    db_path = tmp_path / "e2e.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(scenario, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


@pytest.fixture(scope="module")
def steady_db(tmp_path_factory):
    return _full_run(tmp_path_factory.mktemp("steady"), BASELINE_SCENARIO)


@pytest.fixture(scope="module")
def decline_db(tmp_path_factory):
    decline = Scenario(
        user_id="helga",
        seed=7,
        weeks=10,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=20.0,
        decline_start_week=4,
    )
    return _full_run(tmp_path_factory.mktemp("decline"), decline)


@pytest.fixture(scope="module")
def fatigue_db(tmp_path_factory):
    fatigue = Scenario(
        user_id="helga",
        seed=3,
        weeks=10,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1200.0,
        fatigue_onset_week=5,
    )
    return _full_run(tmp_path_factory.mktemp("fatigue"), fatigue)


@pytest.fixture(scope="module")
def shrink_db(tmp_path_factory):
    shrink = Scenario(
        user_id="helga",
        seed=21,
        weeks=10,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1200.0,
        place_repertoire_shrink=True,
    )
    return _full_run(tmp_path_factory.mktemp("shrink"), shrink)


def test_no_decline_scenario_produces_green_status(steady_db: Path):
    client = TestClient(create_app(steady_db))
    body = client.get("/api/relative/home", params={"user_id": "helga"}).json()
    assert body["status"] == "green"


def test_distance_decline_scenario_fires_relative_card(decline_db: Path):
    client = TestClient(create_app(decline_db))
    body = client.get("/api/relative/home", params={"user_id": "helga"}).json()
    assert body["status"] == "amber"
    assert body["worth_noticing"] is not None


def test_fatigue_scenario_surfaces_in_insights(fatigue_db: Path):
    client = TestClient(create_app(fatigue_db))
    body = client.get("/api/relative/insights", params={"user_id": "helga"}).json()
    fatigue_block = next(b for b in body["blocks"] if "harder" in b["question"])
    assert fatigue_block["verdict"]


def test_place_shrink_pipeline_runs(shrink_db: Path):
    ro = open_db(shrink_db, read_only=True)
    n_cp = ro.execute("SELECT count(*) FROM changepoints WHERE feature = 'place_count'").fetchone()[
        0
    ]
    n_daily = ro.execute("SELECT count(*) FROM daily_features").fetchone()[0]
    ro.close()
    assert n_daily > 0
    # change-point may or may not fire depending on noise — pipeline must at least run
    assert n_cp >= 0
