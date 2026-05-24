import pytest

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


@pytest.fixture(scope="module")
def daily_db(tmp_path_factory):
    import duckdb

    db_path = tmp_path_factory.mktemp("daily") / "d.duckdb"
    con = duckdb.connect(str(db_path))
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    yield con
    con.close()


def test_daily_rows_within_range(daily_db):
    n = daily_db.execute("SELECT count(*) FROM daily_features").fetchone()[0]
    assert 1 <= n <= 8 * 7 + 1


def test_daily_distance_positive(daily_db):
    bad = daily_db.execute(
        "SELECT count(*) FROM daily_features WHERE total_distance_m < 0"
    ).fetchone()[0]
    assert bad == 0
