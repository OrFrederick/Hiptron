from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def test_features_cover_all_walks(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    compute_walk_features(tmp_db)
    n_walks = tmp_db.execute("SELECT count(*) FROM walks").fetchone()[0]
    n_features = tmp_db.execute("SELECT count(*) FROM walk_features").fetchone()[0]
    assert n_walks == n_features


def test_feature_values_in_sane_range(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    compute_walk_features(tmp_db)
    rows = tmp_db.execute(
        "SELECT distance_m, duration_s, mean_speed, peak_speed FROM walk_features"
    ).fetchall()
    for dist, dur, mean_s, peak_s in rows:
        assert 50 < dist < 50_000
        assert 30 < dur < 6 * 3600
        assert 0.1 < mean_s < 3.0
        assert peak_s >= mean_s
