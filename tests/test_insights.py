import json

import pytest

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.pipeline.stages._07_insights import generate_insights
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import Scenario


@pytest.fixture(scope="module")
def insight_db(tmp_path_factory):
    import duckdb
    scenario = Scenario(
        user_id="u1", seed=7, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0, decline_start_week=5,
    )
    db_path = tmp_path_factory.mktemp("insight") / "i.duckdb"
    con = duckdb.connect(str(db_path))
    apply_schema(con)
    generate(scenario, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)
    detect_changepoints(con)
    generate_insights(con)
    yield con
    con.close()


def test_changepoint_produces_two_audience_insights(insight_db):
    # Count changepoints that have a matching insight template (down direction only)
    n_cp = insight_db.execute(
        "SELECT count(*) FROM changepoints WHERE direction = 'down'"
    ).fetchone()[0]
    assert n_cp >= 1
    n_tdist = insight_db.execute(
        "SELECT count(*) FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchone()[0]
    assert n_tdist >= 1
    n_older = insight_db.execute(
        "SELECT count(*) FROM insights WHERE audience = 'older_adult'"
    ).fetchone()[0]
    n_rel = insight_db.execute(
        "SELECT count(*) FROM insights WHERE audience = 'relative'"
    ).fetchone()[0]
    assert n_older == n_cp
    assert n_rel == n_cp


def test_insight_payload_includes_baseline_and_current(insight_db):
    payload_json = insight_db.execute(
        "SELECT payload_json FROM insights "
        "WHERE audience = 'older_adult' LIMIT 1"
    ).fetchone()[0]
    payload = json.loads(payload_json)
    assert {
        "feature", "direction", "baseline_mean", "current_value", "pct_delta"
    } <= payload.keys()
