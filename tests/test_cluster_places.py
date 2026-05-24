import pytest

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


@pytest.fixture(scope="module")
def clustered_db(tmp_path_factory):
    import duckdb
    db_path = tmp_path_factory.mktemp("cluster") / "c.duckdb"
    con = duckdb.connect(str(db_path))
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    yield con
    con.close()


def test_finds_named_clusters(clustered_db):
    n_places = clustered_db.execute("SELECT count(*) FROM places").fetchone()[0]
    assert 1 <= n_places <= 12


def test_visits_recorded(clustered_db):
    n_visits = clustered_db.execute(
        "SELECT count(*) FROM walk_place_visits"
    ).fetchone()[0]
    assert n_visits > 0
