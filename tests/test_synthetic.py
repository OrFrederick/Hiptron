import datetime as dt

import duckdb

from hiptron.db.connection import apply_schema
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


def test_baseline_scenario_produces_expected_volume(tmp_db: duckdb.DuckDBPyConnection):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    n_fixes = tmp_db.execute("SELECT count(*) FROM gps_fixes").fetchone()[0]
    assert n_fixes > 30_000
    n_users = tmp_db.execute("SELECT count(DISTINCT user_id) FROM gps_fixes").fetchone()[0]
    assert n_users == 1


def test_scenario_with_distance_decline_shows_lower_late_distance(tmp_db):
    apply_schema(tmp_db)
    scenario = Scenario(
        user_id="u1",
        seed=42,
        weeks=8,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1500.0,
        distance_decline_pct_per_week=10.0,
        decline_start_week=5,
        fatigue_onset_week=None,
        place_repertoire_shrink=False,
    )
    generate(scenario, tmp_db)
    early = tmp_db.execute(
        "SELECT count(*) FROM gps_fixes WHERE ts < ?",
        (dt.datetime.now() - dt.timedelta(weeks=4),),
    ).fetchone()[0]
    late = tmp_db.execute(
        "SELECT count(*) FROM gps_fixes WHERE ts >= ?",
        (dt.datetime.now() - dt.timedelta(weeks=4),),
    ).fetchone()[0]
    assert late < early


def test_generator_is_deterministic_with_seed(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    rows_a = tmp_db.execute("SELECT lat, lon FROM gps_fixes ORDER BY ts LIMIT 100").fetchall()

    tmp_db.execute("DELETE FROM gps_fixes")
    generate(BASELINE_SCENARIO, tmp_db)
    rows_b = tmp_db.execute("SELECT lat, lon FROM gps_fixes ORDER BY ts LIMIT 100").fetchall()
    assert rows_a == rows_b


def test_gait_fields_default_to_no_signal():
    # Default speed equals the historic implicit speed (22 m / 15 s), so scenarios
    # that don't set gait fields produce byte-identical timing behaviour.
    s = Scenario(
        user_id="t", seed=1, weeks=2, home_lat=52.0, home_lon=13.0,
        outings_per_day=1, mean_outing_distance_m=800.0,
    )
    assert abs(s.walk_speed_mps - 22.0 / 15.0) < 1e-9
    assert s.speed_decline_pct_per_week == 0.0
    assert s.speed_decline_start_week is None
    assert s.walk_fade_pct == 0.0
    assert s.pauses_per_walk is None
    assert s.pause_start_week is None


def test_demo_personas_gait_values():
    from hiptron.synthetic.scenarios import SCENARIOS

    helga = SCENARIOS["helga"]
    assert helga.walk_speed_mps == 1.15
    assert helga.speed_decline_pct_per_week == 3.5
    assert helga.speed_decline_start_week == 6
    assert helga.walk_fade_pct == 20.0

    margarete = SCENARIOS["margarete"]
    assert margarete.walk_speed_mps == 1.0
    assert margarete.pauses_per_walk == (2, 4)
    assert margarete.pause_start_week == 6

    assert SCENARIOS["otto"].walk_speed_mps == 1.1
    assert SCENARIOS["ingrid"].walk_speed_mps == 1.25
    for u in ("otto", "ingrid"):
        assert SCENARIOS[u].pauses_per_walk is None
        assert SCENARIOS[u].walk_fade_pct == 0.0
