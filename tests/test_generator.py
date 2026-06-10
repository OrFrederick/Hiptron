# tests/test_generator.py
from datetime import datetime
from pathlib import Path

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import _outings_for_week, _places_for_week, generate
from hiptron.synthetic.scenarios import DEFAULT_PLACES, SCENARIOS, Scenario


def _scn(**kw) -> Scenario:
    base = dict(
        user_id="t",
        seed=1,
        weeks=12,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=3,
        mean_outing_distance_m=1200.0,
    )
    base.update(kw)
    return Scenario(**base)


def test_outings_taper_reduces_over_weeks():
    s = _scn(outings_decline_start_week=5)
    assert _outings_for_week(s, 0) == 3  # before taper
    assert _outings_for_week(s, 5) < 3  # tapering
    assert _outings_for_week(s, 11) <= _outings_for_week(s, 6)
    assert _outings_for_week(s, 11) >= 1  # never zero


def test_no_taper_when_unset():
    s = _scn()
    assert _outings_for_week(s, 0) == 3
    assert _outings_for_week(s, 11) == 3


def test_places_override_subset():
    subset = DEFAULT_PLACES[:2]
    s = _scn(places=subset)
    assert _places_for_week(s, 0, None) == subset


def test_place_shrink_start_week_is_late_and_sharp():
    s = _scn(place_repertoire_shrink=True, place_shrink_start_week=10)
    # Full repertoire before the start week...
    assert _places_for_week(s, 0, None) == DEFAULT_PLACES
    assert _places_for_week(s, 9, None) == DEFAULT_PLACES
    # ...then a sharp collapse that bottoms out near the end.
    assert len(_places_for_week(s, 10, None)) < len(DEFAULT_PLACES)
    assert len(_places_for_week(s, 12, None)) == 1


def test_personas_have_distinct_user_ids():
    assert set(SCENARIOS) == {"helga", "otto", "margarete", "ingrid"}
    uids = {name: scn.user_id for name, scn in SCENARIOS.items()}
    assert uids == {
        "helga": "helga",
        "otto": "otto",
        "margarete": "margarete",
        "ingrid": "ingrid",
    }
    # ingrid is the healthy control: no decline knobs.
    ing = SCENARIOS["ingrid"]
    assert ing.distance_decline_pct_per_week == 0.0
    assert ing.outings_decline_start_week is None
    assert ing.place_repertoire_shrink is False


# ---------------------------------------------------------------------------
# Gait-speed tests (Tasks 2 + 3)
# ---------------------------------------------------------------------------

_GAIT_END = datetime(2026, 6, 6)


def _gait_db(tmp_path: Path, scenario: Scenario) -> Path:
    """Seed one scenario and run the full pipeline; returns the DB path."""
    db_path = tmp_path / "gait.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(scenario, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def _moving_speed_mps(db_path: Path, user_id: str) -> float:
    con = open_db(db_path, read_only=True)
    try:
        row = con.execute(
            """
            SELECT sum(wf.distance_m) / nullif(sum(wf.duration_s - wf.dwell_s), 0)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = ?
            """,
            (user_id,),
        ).fetchone()
        return float(row[0])
    finally:
        con.close()


def test_walk_speed_mps_controls_transit_speed(tmp_path):
    slow = Scenario(
        user_id="slowpoke", seed=5, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=1, mean_outing_distance_m=900.0,
        walk_speed_mps=0.9, end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, slow)
    v = _moving_speed_mps(db, "slowpoke")
    # Jitter and dwell-boundary effects scatter the measured value around the 0.9 m/s target.
    assert 0.75 <= v <= 1.1


def test_default_speed_unchanged(tmp_path):
    base = Scenario(
        user_id="plain", seed=6, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=1, mean_outing_distance_m=900.0, end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, base)
    v = _moving_speed_mps(db, "plain")
    # Arc-path Bezier geometry yields ~1.15 m/s measured (lower than 22/15 ≈ 1.47
    # because parameter-uniform Bezier steps are not spatially uniform at 22 m each).
    # The point is that default speed is not accidentally broken by Task 2/3.
    assert 0.9 <= v <= 1.35


def test_speed_decline_lowers_late_weeks(tmp_path):
    declining = Scenario(
        user_id="slowing", seed=7, weeks=8, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.2, speed_decline_pct_per_week=5.0,
        speed_decline_start_week=2, end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, declining)
    con = open_db(db, read_only=True)
    try:
        first, last = con.execute(
            """
            WITH
              spans AS (
                SELECT min(start_ts) AS lo, max(start_ts) AS hi
                FROM walks WHERE user_id = 'slowing'
              ),
              mid AS (SELECT lo + (hi - lo) / 2 AS cut FROM spans)
            SELECT
              sum(CASE WHEN w.start_ts <  (SELECT cut FROM mid)
                       THEN wf.distance_m END)
                / nullif(sum(CASE WHEN w.start_ts <  (SELECT cut FROM mid)
                                  THEN wf.duration_s - wf.dwell_s END), 0),
              sum(CASE WHEN w.start_ts >= (SELECT cut FROM mid)
                       THEN wf.distance_m END)
                / nullif(sum(CASE WHEN w.start_ts >= (SELECT cut FROM mid)
                                  THEN wf.duration_s - wf.dwell_s END), 0)
            FROM walks w
            JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = 'slowing'
            """
        ).fetchone()
    finally:
        con.close()
    assert float(last) < float(first) * 0.9


def test_walk_fade_moves_speed_third_delta(tmp_path):
    fading = Scenario(
        user_id="fader", seed=9, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.2, speed_decline_start_week=0, walk_fade_pct=20.0,
        end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, fading)
    con = open_db(db, read_only=True)
    try:
        avg_delta = con.execute(
            """
            SELECT avg(wf.speed_third_delta_pct)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = 'fader'
            """
        ).fetchone()[0]
    finally:
        con.close()
    # Return leg 20% slower → last-third avg speed clearly below first-third.
    # Arc-path baseline (steady, no fade) is ~+7, so fade must shift delta negative
    # enough to cross zero and then some.  −4 leaves a comfortable margin.
    assert float(avg_delta) <= -4.0


def test_no_fade_keeps_third_delta_flat(tmp_path):
    steady = Scenario(
        user_id="steady", seed=10, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.2, end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, steady)
    con = open_db(db, read_only=True)
    try:
        avg_delta = con.execute(
            """
            SELECT avg(wf.speed_third_delta_pct)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = 'steady'
            """
        ).fetchone()[0]
    finally:
        con.close()
    assert abs(float(avg_delta)) < 8.0


def _pause_scenario(user_id: str = "pauser") -> Scenario:
    return Scenario(
        user_id=user_id, seed=11, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.1, pauses_per_walk=(2, 4), pause_start_week=0,
        end_dt=_GAIT_END,
    )


def test_pauses_raise_pause_count(tmp_path):
    db = _gait_db(tmp_path, _pause_scenario())
    con = open_db(db, read_only=True)
    try:
        avg_pauses = con.execute(
            """
            SELECT avg(wf.pause_count)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = 'pauser'
            """
        ).fetchone()[0]
    finally:
        con.close()
    # Destination dwell ≈ 1 pause + 2-4 mid-walk holds → average well above 2.5.
    assert float(avg_pauses) >= 2.5


def test_pauses_do_not_mint_places(tmp_path):
    """Mid-walk holds are < 120 s, under the place-cluster dwell threshold —
    the pausing persona must get the same place count as a pause-free twin."""
    db_pause = _gait_db(tmp_path, _pause_scenario("pauser"))
    plain_dir = tmp_path / "plain"
    plain_dir.mkdir()
    no_pause = Scenario(
        user_id="walker", seed=11, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.1, end_dt=_GAIT_END,
    )
    db_plain = _gait_db(plain_dir, no_pause)

    def n_places(db, uid):
        con = open_db(db, read_only=True)
        try:
            return con.execute(
                "SELECT count(*) FROM places WHERE user_id = ?", (uid,)
            ).fetchone()[0]
        finally:
            con.close()

    assert n_places(db_pause, "pauser") == n_places(db_plain, "walker")
