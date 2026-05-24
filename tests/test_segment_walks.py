from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def test_segments_at_least_one_walk_per_outing_day(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    n_walks = tmp_db.execute("SELECT count(*) FROM walks").fetchone()[0]
    assert n_walks >= 30


def test_walk_start_before_end_and_fix_count_positive(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    bad = tmp_db.execute(
        "SELECT count(*) FROM walks WHERE start_ts >= end_ts OR src_fix_count <= 0"
    ).fetchone()[0]
    assert bad == 0


def test_idempotent_when_run_twice(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    first = tmp_db.execute("SELECT count(*) FROM walks").fetchone()[0]
    segment_walks(tmp_db)
    second = tmp_db.execute("SELECT count(*) FROM walks").fetchone()[0]
    assert first == second
