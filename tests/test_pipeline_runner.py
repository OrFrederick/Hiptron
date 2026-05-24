import subprocess
import sys

import pytest

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import STAGES, run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("runner") / "p.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()
    return db_path


def test_run_all_stages_in_order(seeded_db):
    run_pipeline(seeded_db, stage="all")
    ro = open_db(seeded_db, read_only=True)
    n_daily = ro.execute("SELECT count(*) FROM daily_features").fetchone()[0]
    n_baselines = ro.execute("SELECT count(*) FROM baselines").fetchone()[0]
    ro.close()
    assert n_daily > 0
    assert n_baselines > 0


def test_stage_list_complete():
    expected = [
        "segment_walks", "walk_features", "cluster_places",
        "daily_aggregate", "baselines", "changepoints", "insights",
    ]
    assert list(STAGES.keys()) == expected


def test_cli_runs_single_stage(tmp_path):
    db_path = tmp_path / "p.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()
    result = subprocess.run(
        [sys.executable, "-m", "hiptron.pipeline", "run",
         "--db", str(db_path), "--stage", "segment_walks"],
        capture_output=True, text=True, check=True,
    )
    assert "segment_walks" in result.stdout
    ro = open_db(db_path, read_only=True)
    n_walks = ro.execute("SELECT count(*) FROM walks").fetchone()[0]
    ro.close()
    assert n_walks > 0
