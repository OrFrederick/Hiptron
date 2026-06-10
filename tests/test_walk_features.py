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


def test_pause_floor_and_transit_sums():
    # Hand-built walk: 30 s of sub-threshold stop must NOT count (structural
    # artifacts are 15-24 s; floor is 30 s), a 40 s stop must count once, and
    # transit_m/transit_s must exclude all stopped segments.
    from datetime import datetime, timedelta

    from hiptron.pipeline.stages._02_walk_features import _features_for_walk

    def fix(t_s: int, north_m: float):
        return (
            datetime(2026, 6, 1, 9, 0, 0) + timedelta(seconds=t_s),
            52.0 + north_m / 111_320.0,
            13.0,
        )

    fixes = [
        # moving: 22 m per 15 s (1.47 m/s)
        fix(0, 0), fix(15, 22), fix(30, 44), fix(45, 66), fix(60, 88),
        # 20 s stop (two 10 s zero-distance segments) -> below 30 s floor
        fix(70, 88), fix(80, 88),
        # moving again
        fix(95, 110), fix(110, 132), fix(125, 154),
        # 40 s stop -> counts as ONE pause
        fix(135, 154), fix(145, 154), fix(155, 154), fix(165, 154),
        # moving again
        fix(180, 176), fix(195, 198),
    ]
    row = _features_for_walk("w1", fixes)
    pause_count, dwell_s = row[5], row[6]
    transit_m, transit_s = row[9], row[10]
    assert pause_count == 1
    assert abs(dwell_s - 60.0) < 1e-6
    assert abs(transit_s - 135.0) < 1e-6
    assert abs(transit_m - 9 * 22.0) < 1.0  # 9 moving segments of ~22 m
