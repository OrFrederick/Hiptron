# tests/test_radius.py
from pathlib import Path

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import Scenario


def test_radius_is_home_anchored_not_path_half(tmp_path: Path):
    db = tmp_path / "r.duckdb"
    con = open_db(db, read_only=False)
    apply_schema(con)
    generate(
        Scenario(
            user_id="r",
            seed=5,
            weeks=6,
            home_lat=52.52,
            home_lon=13.40,
            outings_per_day=2,
            mean_outing_distance_m=1200.0,
        ),
        con,
    )
    con.close()
    run_pipeline(db, stage="all")
    ro = open_db(db, read_only=True)
    rows = ro.execute(
        "SELECT max(activity_radius_m), max(total_distance_m) FROM daily_features"
    ).fetchone()
    ro.close()
    max_radius, max_dist = rows
    # Real straight-line radius to farthest place is far smaller than half the
    # daily path length (the old MAX(distance/2) bug). Places sit <300 m from home.
    assert max_radius is not None and 50.0 < max_radius < 400.0
    assert max_radius < max_dist / 2.0
