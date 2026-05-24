import pytest

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO

TRACKED_FEATURES = {
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
}


@pytest.fixture(scope="module")
def baseline_db(tmp_path_factory):
    import duckdb

    db_path = tmp_path_factory.mktemp("baselines") / "b.duckdb"
    con = duckdb.connect(str(db_path))
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)
    yield con
    con.close()


def test_baselines_skip_first_4_weeks(baseline_db):
    earliest = baseline_db.execute("SELECT min(date) FROM daily_features").fetchone()[0]
    earliest_baseline = baseline_db.execute("SELECT min(window_end) FROM baselines").fetchone()[0]
    assert (earliest_baseline - earliest).days >= 27


def test_each_tracked_feature_has_baselines(baseline_db):
    feats = {r[0] for r in baseline_db.execute("SELECT DISTINCT feature FROM baselines").fetchall()}
    assert TRACKED_FEATURES.issubset(feats)
