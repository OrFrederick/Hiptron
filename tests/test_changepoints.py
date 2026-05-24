import pytest

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


def _build(con, scenario):
    apply_schema(con)
    generate(scenario, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)
    detect_changepoints(con)


@pytest.fixture(scope="module")
def steady_db(tmp_path_factory):
    import duckdb

    db_path = tmp_path_factory.mktemp("steady") / "s.duckdb"
    con = duckdb.connect(str(db_path))
    _build(con, BASELINE_SCENARIO)
    yield con
    con.close()


@pytest.fixture(scope="module")
def decline_db(tmp_path_factory):
    import duckdb

    decline = Scenario(
        user_id="u1",
        seed=7,
        weeks=10,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0,
        decline_start_week=5,
    )
    db_path = tmp_path_factory.mktemp("decline") / "d.duckdb"
    con = duckdb.connect(str(db_path))
    _build(con, decline)
    yield con
    con.close()


def test_no_changepoints_for_steady_baseline(steady_db):
    n = steady_db.execute(
        "SELECT count(*) FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchone()[0]
    assert n == 0


def test_distance_decline_scenario_fires_changepoint(decline_db):
    rows = decline_db.execute(
        "SELECT detected_at, direction FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchall()
    assert len(rows) >= 1
    assert any(direction == "down" for _, direction in rows)
