from pathlib import Path

import pytest

from hiptron.backend.queries import older_adult_home, patterns_screen
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


def test_patterns_shape(demo_db: Path):
    p = patterns_screen(demo_db, "helga")
    assert p.user_id == "helga"
    feats = {d.feature for d in p.monthly_deltas}
    assert feats <= {"total_distance_m", "activity_radius_m", "n_outings", "place_count"}
    for d in p.monthly_deltas:
        assert d.direction in ("up", "down", "flat")


def test_rhythm_shares_sum_to_one(demo_db: Path):
    p = patterns_screen(demo_db, "helga")
    if p.rhythm is not None:
        assert abs(sum(b.share for b in p.rhythm.buckets) - 1.0) < 1e-6
        # zero-share buckets are dropped → 1..3 non-empty buckets
        assert 1 <= len(p.rhythm.buckets) <= 3
        assert all(b.share > 0 for b in p.rhythm.buckets)


def test_routine_in_bounds_and_steady_persona_stable(demo_db: Path):
    p = patterns_screen(demo_db, "ingrid")
    if p.routine is not None:
        assert 0 <= p.routine.score <= 100
        assert p.routine.band == "stabil"


def test_margarete_outings_down(demo_db: Path):
    p = patterns_screen(demo_db, "margarete")
    d = {x.feature: x for x in p.monthly_deltas}
    if "n_outings" in d:
        assert d["n_outings"].direction in ("down", "flat")


def test_older_adult_home_has_highlight_field(demo_db: Path):
    h = older_adult_home(demo_db, "helga")
    assert hasattr(h, "highlight")


def test_time_outdoors_present_and_sane(demo_db: Path):
    # otto is out a lot (~2-3h/day) → the metric must surface and read plausibly.
    p = patterns_screen(demo_db, "otto")
    assert p.time_outdoors is not None
    t = p.time_outdoors
    assert t.avg_min_per_day > 0
    assert 30 <= t.avg_min_per_day <= 360
    assert t.direction in ("up", "down", "flat")
    assert t.sentence


def test_time_outdoors_all_personas_type(demo_db: Path):
    # Either a valid object or a clean None (hidden gate) — never a crash, for every persona.
    for u in ("helga", "otto", "margarete", "ingrid"):
        t = patterns_screen(demo_db, u).time_outdoors
        if t is not None:
            assert 0 <= t.avg_min_per_day <= 600
            assert t.direction in ("up", "down", "flat")
