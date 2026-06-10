# Gait Metrics (Tempo, Pausen, Walk-Fade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the last 3 Mobility Pattern Catalog metrics (walking speed, mid-walk pauses, within-walk fade) on the relative-mode Patterns screen, with real trends in the synthetic data (helga slows + fades, margarete pauses more, otto/ingrid stable).

**Architecture:** Generator gains per-persona gait parameters (speed via per-fix step *time*, fade via slower return leg, pauses via short mid-walk holds from a **separate** RNG stream so existing draws stay bit-identical). Pipeline is untouched — stage 2 already computes `mean_speed`, `pause_count`, `dwell_s`, `speed_third_delta_pct`. Three new read-side query helpers + Pydantic models feed three new blocks in `Patterns.tsx`. Then reseed, re-run pipeline, re-bake static API.

**Tech Stack:** Python (dataclasses, DuckDB), Pydantic, FastAPI read-side, React + inline-SVG chart primitives, pytest, vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-hiptron-gait-metrics-design.md` — read it first, especially "Generator changes" and the wording rules (observations, never diagnoses; no "Ermüdung"/"Sturzrisiko"; internal name is `walk_fade`, "fatigue" never appears in API fields or UI).

**Commands** (run from repo root):
- Python tests: `.venv/bin/python -m pytest tests/test_generator.py -q` (etc.)
- Lint/type: `.venv/bin/ruff check hiptron tests && .venv/bin/mypy hiptron`
- Webapp: `pnpm -C webapp test`, `pnpm -C webapp lint`, `pnpm -C webapp build`

**Working branch:** `feat/gait-metrics` (already created; spec committed).

---

### Task 1: Scenario gait fields + persona values

**Files:**
- Modify: `hiptron/synthetic/scenarios.py`
- Test: `tests/test_synthetic.py` (append)

- [ ] **Step 1: Write the failing test** — append to `tests/test_synthetic.py`:

```python
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
```

(Match the existing import style at the top of `tests/test_synthetic.py` — `Scenario` is already imported there.)

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_synthetic.py -q`
Expected: FAIL — `TypeError`/`AttributeError`: unexpected keyword / no attribute `walk_speed_mps`.

- [ ] **Step 3: Implement** — in `hiptron/synthetic/scenarios.py`, add to the `Scenario` dataclass after `end_dt: datetime | None = None`:

```python
    # ── Gait (read by the generator; all defaults mean "no signal") ──
    # Default = the historic implicit transit speed TRANSIT_STEP_M / TRANSIT_STEP_S
    # (22 m / 15 s). Hardcoded to avoid a circular import with generator.py.
    walk_speed_mps: float = 22.0 / 15.0
    speed_decline_pct_per_week: float = 0.0
    speed_decline_start_week: int | None = None
    # Within-walk fade: the return leg is emitted this % slower once
    # speed_decline_start_week is reached (drives speed_third_delta_pct).
    walk_fade_pct: float = 0.0
    # Mid-walk pauses: (min, max) short holds per outing from pause_start_week on.
    # Each hold is 20–90 s — hard-capped under the 120 s place-cluster threshold.
    pauses_per_walk: tuple[int, int] | None = None
    pause_start_week: int | None = None
```

Then set persona values:
- `HELGA_SCENARIO`: add `walk_speed_mps=1.15, speed_decline_pct_per_week=3.5, speed_decline_start_week=6, walk_fade_pct=20.0`
- `OTTO_SCENARIO`: add `walk_speed_mps=1.1`
- `MARGARETE_SCENARIO`: add `walk_speed_mps=1.0, pauses_per_walk=(2, 4), pause_start_week=6`
- `INGRID_SCENARIO`: add `walk_speed_mps=1.25`

- [ ] **Step 4: Run to verify pass**

Run: `.venv/bin/python -m pytest tests/test_synthetic.py -q`
Expected: PASS (all, including pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add hiptron/synthetic/scenarios.py tests/test_synthetic.py
git commit -m "feat(synthetic): per-persona gait scenario fields (speed, fade, pauses)"
```

---

### Task 2: Generator — per-persona walking speed

**Files:**
- Modify: `hiptron/synthetic/generator.py`
- Test: `tests/test_generator.py` (append)

Speed is realized by varying per-fix step **time** (spatial spacing `TRANSIT_STEP_M = 22` stays): `step_s = TRANSIT_STEP_M / speed`. No RNG involved, so the main draw sequence is untouched. The dormant `fatigue_onset_week` step-time hook is removed (it slowed the whole walk uniformly — the old "symmetric signal" bug; the `Scenario` field itself stays because `tests/test_synthetic.py` passes it).

- [ ] **Step 1: Write the failing test** — append to `tests/test_generator.py` (mirror that file's existing imports/harness; add the helper at module level so Tasks 3–4 reuse it):

```python
from datetime import datetime
from pathlib import Path

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import Scenario

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
    # GPS jitter adds path length, so measured moving speed sits slightly above target.
    assert 0.75 <= v <= 1.1


def test_default_speed_unchanged(tmp_path):
    base = Scenario(
        user_id="plain", seed=6, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=1, mean_outing_distance_m=900.0, end_dt=_GAIT_END,
    )
    db = _gait_db(tmp_path, base)
    v = _moving_speed_mps(db, "plain")
    assert 1.25 <= v <= 1.7  # ≈ 22/15 ≈ 1.47 m/s, the historic implicit speed


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
            WITH spans AS (SELECT min(start_ts) AS lo, max(start_ts) AS hi FROM walks WHERE user_id = 'slowing')
            SELECT
              sum(CASE WHEN w.start_ts < (SELECT lo + (hi - lo) / 2 FROM spans) THEN wf.distance_m END)
                / nullif(sum(CASE WHEN w.start_ts < (SELECT lo + (hi - lo) / 2 FROM spans) THEN wf.duration_s - wf.dwell_s END), 0),
              sum(CASE WHEN w.start_ts >= (SELECT lo + (hi - lo) / 2 FROM spans) THEN wf.distance_m END)
                / nullif(sum(CASE WHEN w.start_ts >= (SELECT lo + (hi - lo) / 2 FROM spans) THEN wf.duration_s - wf.dwell_s END), 0)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = 'slowing'
            """
        ).fetchone()
    finally:
        con.close()
    assert float(last) < float(first) * 0.9
```

(If `tests/test_generator.py` already has a seed-and-pipeline helper, reuse it instead of `_gait_db` — but keep `_gait_db`/`_moving_speed_mps` names if adding, since Tasks 3–4 reference them.)

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_generator.py -q -k "speed"`
Expected: FAIL — `test_walk_speed_mps_controls_transit_speed` and `test_speed_decline_lowers_late_weeks` measure ≈1.47 m/s regardless of `walk_speed_mps`. (`test_default_speed_unchanged` may already pass.)

- [ ] **Step 3: Implement** — in `hiptron/synthetic/generator.py`:

3a. Add helpers after `_outings_for_week`:

```python
def _gait_speed_mps(scenario: Scenario, week_idx: int) -> float:
    """Transit speed for this week: base speed, optionally declining after onset."""
    speed = scenario.walk_speed_mps
    start = scenario.speed_decline_start_week
    if start is not None and week_idx >= start and scenario.speed_decline_pct_per_week > 0:
        weeks_in = week_idx - start + 1
        speed *= max(0.6, 1.0 - scenario.speed_decline_pct_per_week / 100.0 * weeks_in)
    return speed


def _fade_factor(scenario: Scenario, week_idx: int) -> float:
    """Return-leg speed multiplier (<1 = slower towards the end of the walk)."""
    start = scenario.speed_decline_start_week
    if scenario.walk_fade_pct > 0 and start is not None and week_idx >= start:
        return 1.0 - scenario.walk_fade_pct / 100.0
    return 1.0
```

3b. In `generate()`, create the separate gait RNG right after `rng = random.Random(scenario.seed)`:

```python
    # Separate stream for all gait-related draws (pause placement/holds): keeps the
    # main draw sequence bit-identical to pre-gait code, so route/place/changepoint
    # timing of existing personas does not drift.
    gait_rng = random.Random(f"{scenario.seed}-gait")
```

3c. Thread `week_idx` and `gait_rng` through the emit chain. The call inside `generate()` becomes:

```python
            end_dt = _emit_outing(rows, scenario, place, start_dt, decline_factor, rng, week_idx, gait_rng)
```

`_emit_outing` passes both through to `_emit_outing_routed` / `_emit_outing_arc` (extend all three signatures with `week_idx: int, gait_rng: random.Random`).

3d. In **both** `_emit_outing_routed` and `_emit_outing_arc`, replace

```python
    step_s = TRANSIT_STEP_S
    if scenario.fatigue_onset_week is not None:
        step_s = int(TRANSIT_STEP_S / 0.9)
```

with

```python
    speed = _gait_speed_mps(scenario, week_idx)
    step_out_s = TRANSIT_STEP_M / speed
    step_back_s = step_out_s / _fade_factor(scenario, week_idx)
```

and use `timedelta(seconds=step_out_s)` on the outbound leg and `timedelta(seconds=step_back_s)` on the return leg (replacing the former `timedelta(seconds=step_s)` in each loop). `timedelta` accepts floats — sub-second precision is fine.

- [ ] **Step 4: Run to verify pass**

Run: `.venv/bin/python -m pytest tests/test_generator.py tests/test_synthetic.py -q`
Expected: PASS (new + pre-existing).

- [ ] **Step 5: Commit**

```bash
git add hiptron/synthetic/generator.py tests/test_generator.py
git commit -m "feat(synthetic): persona walking speed via per-fix step time"
```

---

### Task 3: Generator — within-walk fade

**Files:**
- Modify: `hiptron/synthetic/generator.py` (only if Task 2's `_fade_factor` wiring missed something)
- Test: `tests/test_generator.py` (append)

The fade mechanism (slower return leg) was already wired in Task 2 (`step_back_s`). This task proves it moves `speed_third_delta_pct`.

- [ ] **Step 1: Write the failing-or-passing test** — append:

```python
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
    assert float(avg_delta) <= -8.0


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
```

- [ ] **Step 2: Run**

Run: `.venv/bin/python -m pytest tests/test_generator.py -q -k "fade or third"`
Expected: PASS if Task 2 wired `step_back_s` correctly; if `test_walk_fade_moves_speed_third_delta` fails, the return-leg loop is still using the outbound step time — fix and re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/test_generator.py
git commit -m "test(synthetic): within-walk fade moves speed_third_delta_pct"
```

---

### Task 4: Generator — mid-walk pauses

**Files:**
- Modify: `hiptron/synthetic/generator.py`
- Test: `tests/test_generator.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
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
    no_pause = Scenario(
        user_id="walker", seed=11, weeks=4, home_lat=52.52, home_lon=13.405,
        outings_per_day=2, mean_outing_distance_m=900.0,
        walk_speed_mps=1.1, end_dt=_GAIT_END,
    )
    db_plain = _gait_db(tmp_path / "plain", no_pause)

    def n_places(db, uid):
        con = open_db(db, read_only=True)
        try:
            return con.execute(
                "SELECT count(*) FROM places WHERE user_id = ?", (uid,)
            ).fetchone()[0]
        finally:
            con.close()

    assert n_places(db_pause, "pauser") == n_places(db_plain, "walker")
```

(`tmp_path / "plain"` needs `(tmp_path / "plain").mkdir()` first — add it, or give `_gait_db` a `name: str = "gait.duckdb"` parameter and pass distinct names; either is fine, keep it consistent.)

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_generator.py -q -k "pause"`
Expected: `test_pauses_raise_pause_count` FAILS (avg ≈ 1.0 — destination dwell only).

- [ ] **Step 3: Implement** — in `hiptron/synthetic/generator.py`:

3a. Helpers after `_fade_factor`:

```python
def _pause_plan(
    scenario: Scenario, week_idx: int, n_leg_pts: int, gait_rng: random.Random
) -> tuple[set[int], set[int]]:
    """Pick outbound/return fix indices at which to hold. Empty when inactive."""
    if (
        scenario.pauses_per_walk is None
        or scenario.pause_start_week is None
        or week_idx < scenario.pause_start_week
        or n_leg_pts < 8
    ):
        return set(), set()
    lo, hi = scenario.pauses_per_walk
    n = gait_rng.randint(lo, hi)
    n_out = n // 2
    n_back = n - n_out

    def pick(k: int) -> set[int]:
        if k <= 0:
            return set()
        candidates = range(2, n_leg_pts - 2)
        return set(gait_rng.sample(candidates, min(k, len(candidates))))

    return pick(n_out), pick(n_back)


def _emit_pause(
    rows: list[Any],
    scenario: Scenario,
    lat: float,
    lon: float,
    t: datetime,
    gait_rng: random.Random,
) -> datetime:
    """Short stationary hold mid-walk. 20-90 s — hard-capped under the 120 s
    dwell threshold of the place clusterer, so pauses never become 'places'.
    All draws come from gait_rng (never the main rng) to keep existing
    personas' draw sequences unchanged."""
    hold_s = gait_rng.uniform(20.0, 90.0)
    for _ in range(max(2, int(hold_s // DWELL_SAMPLE_S))):
        jlat = lat + gait_rng.gauss(0, 0.5) / METERS_PER_DEG_LAT
        jlon = lon + gait_rng.gauss(0, 0.5) / (
            METERS_PER_DEG_LAT * math.cos(math.radians(lat))
        )
        rows.append((scenario.user_id, t, jlat, jlon, gait_rng.uniform(3.0, 8.0)))
        t += timedelta(seconds=DWELL_SAMPLE_S)
    return t
```

3b. In `_emit_outing_routed`, after `outbound = spur + spine_pts`:

```python
    pause_out, pause_back = _pause_plan(scenario, week_idx, len(outbound), gait_rng)
```

Outbound loop becomes:

```python
    t = start_dt
    for i, (lat, lon) in enumerate(outbound):
        emit_ll(lat, lon, t, 1.5)
        t += timedelta(seconds=step_out_s)
        if i in pause_out:
            t = _emit_pause(rows, scenario, lat, lon, t, gait_rng)
```

Return loop becomes:

```python
    for i, (lat, lon) in enumerate(reversed(outbound)):
        emit_ll(lat, lon, t, 1.5)
        t += timedelta(seconds=step_back_s)
        if i in pause_back:
            t = _emit_pause(rows, scenario, lat, lon, t, gait_rng)
    return t
```

3c. In `_emit_outing_arc`, before the outbound loop add `pause_out, pause_back = _pause_plan(scenario, week_idx, n_steps + 1, gait_rng)`. In the outbound loop (`for i in range(n_steps + 1)`), after `t += timedelta(seconds=step_out_s)` add:

```python
        if i in pause_out:
            lat = scenario.home_lat + _m_to_deg_lat(y_m)
            lon = scenario.home_lon + _m_to_deg_lon(x_m, scenario.home_lat)
            t = _emit_pause(rows, scenario, lat, lon, t, gait_rng)
```

Mirror the same in the return loop with `pause_back` and `step_back_s`.

- [ ] **Step 4: Run to verify pass**

Run: `.venv/bin/python -m pytest tests/test_generator.py tests/test_synthetic.py tests/test_e2e_scenarios.py -q`
Expected: PASS — including the e2e scenario tests (proves existing persona stories survived).

- [ ] **Step 5: Commit**

```bash
git add hiptron/synthetic/generator.py tests/test_generator.py
git commit -m "feat(synthetic): mid-walk pauses from separate gait RNG stream"
```

---

### Task 5: Backend — models + read-side queries + wiring

**Files:**
- Modify: `hiptron/backend/models.py` (after `TimeOutdoors`, before `PatternsScreen`)
- Modify: `hiptron/backend/queries.py` (helpers after `_time_outdoors`, wiring in `patterns_screen`; extend the `models` import)
- Test: `tests/test_patterns.py` (append)

- [ ] **Step 1: Write the failing tests** — append to `tests/test_patterns.py`:

```python
def test_walking_speed_helga_slower(demo_db: Path):
    ws = patterns_screen(demo_db, "helga").walking_speed
    assert ws is not None
    assert ws.direction == "down"
    assert 2.0 <= ws.this_kmh <= 5.5
    assert len(ws.weekly) >= 8
    assert ws.sentence


def test_walking_speed_ingrid_flat(demo_db: Path):
    ws = patterns_screen(demo_db, "ingrid").walking_speed
    assert ws is not None
    assert ws.direction == "flat"


def test_pauses_margarete_up(demo_db: Path):
    ps = patterns_screen(demo_db, "margarete").pauses
    assert ps is not None
    assert ps.avg_pauses_per_walk >= 1.5
    assert ps.direction == "up"
    assert ps.sentence


def test_pauses_otto_quiet(demo_db: Path):
    ps = patterns_screen(demo_db, "otto").pauses
    if ps is not None:
        assert ps.avg_pauses_per_walk <= 1.0
        assert ps.direction == "flat"


def test_walk_fade_helga_present(demo_db: Path):
    wf = patterns_screen(demo_db, "helga").walk_fade
    assert wf is not None
    assert wf.this_delta_pct <= -8.0
    assert wf.direction == "down"
    assert "%" in wf.sentence


def test_walk_fade_ingrid_flat(demo_db: Path):
    wf = patterns_screen(demo_db, "ingrid").walk_fade
    if wf is not None:
        assert wf.direction == "flat"


def test_caregiver_status_invariant(demo_db: Path):
    # Gait additions must not disturb the demo's amber/green stories.
    from hiptron.backend.queries import relative_home

    for u in ("helga", "otto", "margarete"):
        assert relative_home(demo_db, u).status == "amber"
    assert relative_home(demo_db, "ingrid").status == "green"
```

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_patterns.py -q`
Expected: FAIL — `PatternsScreen` has no attribute `walking_speed`. (Fixture build takes ~5–6 min; subsequent tests in the module reuse it.)

- [ ] **Step 3: Implement models** — in `hiptron/backend/models.py`, after `TimeOutdoors`:

```python
class SpeedPoint(BaseModel):
    week_start: dt.date
    kmh: float


class WalkingSpeed(BaseModel):
    weekly: list[SpeedPoint]
    this_kmh: float
    prior_kmh: float
    pct_delta: float
    direction: Literal["up", "down", "flat"]
    sentence: str


class PauseStats(BaseModel):
    avg_pauses_per_walk: float
    prior_avg: float
    direction: Literal["up", "down", "flat"]
    sentence: str


class WalkFade(BaseModel):
    this_delta_pct: float
    prior_delta_pct: float
    direction: Literal["up", "down", "flat"]
    sentence: str
```

and extend `PatternsScreen`:

```python
    walking_speed: WalkingSpeed | None = None
    pauses: PauseStats | None = None
    walk_fade: WalkFade | None = None
```

- [ ] **Step 4: Implement queries** — in `hiptron/backend/queries.py`, extend the models import with `PauseStats, SpeedPoint, WalkFade, WalkingSpeed`, then add after `_time_outdoors`:

```python
def _walking_speed(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> WalkingSpeed | None:
    # Moving speed = distance / (duration - dwell): walk_features.mean_speed divides
    # by the full duration including the 10-40 min destination dwell, which would
    # measure dwell randomness, not gait. Subtracting dwell_s (all sub-0.3 m/s time)
    # recovers transit speed from existing columns. Shown as an observation, not a verdict.
    weekly_rows = con.execute(
        """
        SELECT CAST(date_trunc('week', w.start_ts) AS DATE) AS wk,
               sum(wf.distance_m) / nullif(sum(wf.duration_s - wf.dwell_s), 0) AS mps
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 84 DAY
        GROUP BY 1 ORDER BY 1
        """,
        (user_id, ref_date),
    ).fetchall()
    weekly = [
        SpeedPoint(week_start=wk, kmh=round(float(mps) * 3.6, 2))
        for wk, mps in weekly_rows
        if mps is not None and mps > 0
    ]
    row = con.execute(
        """
        SELECT
          sum(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN wf.distance_m END)
            / nullif(sum(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                              THEN wf.duration_s - wf.dwell_s END), 0) AS this_mps,
          sum(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY THEN wf.distance_m END)
            / nullif(sum(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                              THEN wf.duration_s - wf.dwell_s END), 0) AS prior_mps,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_mps, prior_mps, n_this = row
    # Hidden gate: < 10 walks in the window -> no honest average (mirrors _routine).
    if this_mps is None or n_this is None or int(n_this) < 10:
        return None
    this_kmh = float(this_mps) * 3.6
    prior_kmh = float(prior_mps) * 3.6 if prior_mps else 0.0
    if prior_kmh > 0:
        pct = (this_kmh - prior_kmh) / prior_kmh * 100.0
        direction: Literal["up", "down", "flat"] = (
            "flat" if abs(pct) < 10 else ("up" if pct > 0 else "down")
        )
    else:
        pct, direction = 0.0, "flat"
    tail = {
        "flat": "Ähnlich wie im Vormonat.",
        "up": "Etwas flotter als im Vormonat.",
        "down": "Etwas langsamer als im Vormonat.",
    }[direction]
    sentence = f"Zuletzt im Schnitt etwa {_de_num(this_kmh)} km/h unterwegs. {tail}"
    return WalkingSpeed(
        weekly=weekly,
        this_kmh=round(this_kmh, 2),
        prior_kmh=round(prior_kmh, 2),
        pct_delta=float(pct),
        direction=direction,
        sentence=sentence,
    )


def _pause_stats(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> PauseStats | None:
    # GREATEST(pause_count - 1, 0): every outing's destination dwell registers as one
    # pause in stage 2, so the baseline is ~1 for everyone; subtracting it isolates
    # genuine mid-walk stops. Dwell minutes are NOT shown (dwell_s is dominated by
    # the destination dwell and can't be separated read-side).
    row = con.execute(
        """
        SELECT
          avg(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                   THEN GREATEST(wf.pause_count - 1, 0) END) AS this_p,
          avg(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                   THEN GREATEST(wf.pause_count - 1, 0) END) AS prior_p,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_p, prior_p, n_this = row
    if this_p is None or n_this is None or int(n_this) < 10:
        return None
    this_v = float(this_p)
    prior_v = float(prior_p or 0.0)
    # Absolute gate: prior averages sit near zero, percent deltas would be unstable.
    diff = this_v - prior_v
    direction: Literal["up", "down", "flat"] = (
        "flat" if abs(diff) < 0.7 else ("up" if diff > 0 else "down")
    )
    if this_v < 0.5 and direction == "flat":
        sentence = "Geht meist ohne Zwischenstopp durch."
    elif direction == "up":
        sentence = (
            "Macht unterwegs öfter kurz Halt als im Vormonat. "
            "Eine kleine Pause gehört dazu."
        )
    elif direction == "down":
        sentence = "Macht unterwegs seltener Halt als im Vormonat."
    else:
        sentence = "Macht ab und zu kurz Halt unterwegs. Ähnlich wie im Vormonat."
    return PauseStats(
        avg_pauses_per_walk=round(this_v, 1),
        prior_avg=round(prior_v, 1),
        direction=direction,
        sentence=sentence,
    )


def _walk_fade(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> WalkFade | None:
    # Within-walk tempo profile (catalog #within-walk). Negative = slower towards the
    # end. Worded as a tempo observation; "fatigue" appears nowhere in API or UI.
    row = con.execute(
        """
        SELECT
          avg(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                   THEN wf.speed_third_delta_pct END) AS this_d,
          avg(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                   THEN wf.speed_third_delta_pct END) AS prior_d,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_d, prior_d, n_this = row
    if this_d is None or n_this is None or int(n_this) < 10:
        return None
    this_v = float(this_d)
    direction: Literal["up", "down", "flat"] = "down" if this_v <= -8.0 else "flat"
    if direction == "down":
        sentence = (
            "Gegen Ende eines Spaziergangs wird das Tempo ruhiger. "
            f"Das letzte Drittel ist etwa {abs(round(this_v))} % langsamer."
        )
    else:
        sentence = "Das Tempo bleibt über den Spaziergang hinweg ähnlich."
    return WalkFade(
        this_delta_pct=round(this_v, 1),
        prior_delta_pct=round(float(prior_d or 0.0), 1),
        direction=direction,
        sentence=sentence,
    )
```

Wire into `patterns_screen` (after `time_outdoors=`):

```python
            walking_speed=_walking_speed(con, user_id, ref_date),
            pauses=_pause_stats(con, user_id, ref_date),
            walk_fade=_walk_fade(con, user_id, ref_date),
```

- [ ] **Step 5: Run to verify pass**

Run: `.venv/bin/python -m pytest tests/test_patterns.py -q`
Expected: PASS (7 pre-existing + 7 new). If `test_walking_speed_helga_slower` reads `flat`: check the measured 28v28 delta — it must clear 10%; the scenario decline is tuned to ≈ −13% (3.5%/wk from week 6).

- [ ] **Step 6: Lint/type + commit**

Run: `.venv/bin/ruff check hiptron tests && .venv/bin/mypy hiptron`
Expected: clean.

```bash
git add hiptron/backend/models.py hiptron/backend/queries.py tests/test_patterns.py
git commit -m "feat(patterns): walking speed, pauses, walk-fade read-side metrics"
```

---

### Task 6: Frontend — types, chart primitives, Patterns blocks

**Files:**
- Modify: `webapp/src/shared/types.ts`
- Modify: `webapp/src/shared/charts.tsx`
- Modify: `webapp/src/modes/relative/Patterns.tsx`
- Test: `webapp/tests/shared/charts.test.tsx` (append)

- [ ] **Step 1: Write the failing tests** — in `webapp/tests/shared/charts.test.tsx`, extend the charts import with `PauseStat, SpeedTrendLine` and append inside the `describe`:

```tsx
  it("SpeedTrendLine renders a polyline and km/h ticks", () => {
    const { container } = render(
      <SpeedTrendLine points={[
        { week_start: "2026-04-06", kmh: 4.1 },
        { week_start: "2026-04-13", kmh: 4.0 },
        { week_start: "2026-04-20", kmh: 3.6 },
        { week_start: "2026-04-27", kmh: 3.4 },
      ]} />
    );
    expect(container.querySelector("polyline")).toBeTruthy();
    expect(container.textContent).toContain("km/h");
  });

  it("SpeedTrendLine renders nothing with fewer than 2 points", () => {
    const { container } = render(<SpeedTrendLine points={[{ week_start: "2026-04-06", kmh: 4.1 }]} />);
    expect(container.querySelector("svg")).toBeFalsy();
  });

  it("PauseStat formats average with German comma", () => {
    const { container } = render(<PauseStat avg={2.5} direction="up" />);
    expect(container.textContent).toContain("2,5");
    expect(container.textContent).toContain("Pausen");
    expect(container.textContent).toContain("Vormonat");
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm -C webapp test`
Expected: FAIL — `SpeedTrendLine`/`PauseStat` not exported.

- [ ] **Step 3: Implement types** — in `webapp/src/shared/types.ts`, after `TimeOutdoors`:

```ts
export interface SpeedPoint {
  week_start: string;
  kmh: number;
}
export interface WalkingSpeed {
  weekly: SpeedPoint[];
  this_kmh: number;
  prior_kmh: number;
  pct_delta: number;
  direction: "up" | "down" | "flat";
  sentence: string;
}
export interface PauseStats {
  avg_pauses_per_walk: number;
  prior_avg: number;
  direction: "up" | "down" | "flat";
  sentence: string;
}
export interface WalkFade {
  this_delta_pct: number;
  prior_delta_pct: number;
  direction: "up" | "down" | "flat";
  sentence: string;
}
```

and extend `PatternsScreen`:

```ts
  walking_speed: WalkingSpeed | null;
  pauses: PauseStats | null;
  walk_fade: WalkFade | null;
```

- [ ] **Step 4: Implement primitives** — in `webapp/src/shared/charts.tsx`, after `TimeOutdoorsStat`:

```tsx
// ── Weekly walking-speed line (tempo observation, never a verdict) ──
function kmhLabel(v: number): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return `${s} km/h`;
}

export function SpeedTrendLine({ points }: { points: { week_start: string; kmh: number }[] }) {
  if (points.length < 2) return null;
  const W = 300, H = 132, padL = 56, padR = 8, padT = 10, padB = 24;
  const maxV = niceAxisMax(Math.max(...points.map((p) => p.kmh), 0.001) * 1.1);
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const poly = points.map((p, i) => `${x(i)},${y(p.kmh)}`).join(" ");
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
  };
  const ticks = [0, maxV / 2, maxV];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={1} />
          <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill={c.textMuted}>
            {kmhLabel(v)}
          </text>
        </g>
      ))}
      <polyline points={poly} fill="none" stroke={c.blue600} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={padL} y={H - 6} fontSize={10.5} fill={c.textMuted}>
        {fmtDate(points[0].week_start)}
      </text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10.5} fill={c.textMuted}>
        {fmtDate(points[points.length - 1].week_start)}
      </text>
    </svg>
  );
}

// ── Mid-walk pause hero stat (everyday observation, mirrors TimeOutdoorsStat) ──
export function PauseStat({ avg, direction }: { avg: number; direction: "up" | "down" | "flat" }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
  const tint = direction === "flat" ? c.textMuted : c.blue600;
  const n = Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 30, fontWeight: 700, color: c.textDark, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        Ø {n} {avg === 1 ? "Pause" : "Pausen"}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: tint }}>
        <span style={{ fontSize: 11 }}>{arrow}</span>
        {direction === "flat" ? "etwa gleich" : "Vormonat"}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Wire blocks** — in `webapp/src/modes/relative/Patterns.tsx`: extend the charts import to `{ DeltaRow, PauseStat, RhythmBars, RoutineBar, SpeedTrendLine, TimeOutdoorsStat }`, then insert between the `data.time_outdoors` block and the `data.monthly_deltas` block:

```tsx
      {data.walking_speed && (
        <>
          <SectionLabel>Tempo</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
              {data.walking_speed.sentence}
            </div>
            <SpeedTrendLine points={data.walking_speed.weekly} />
          </Card>
        </>
      )}

      {data.pauses && (
        <>
          <SectionLabel>Pausen unterwegs</SectionLabel>
          <Card>
            <div style={{ marginBottom: 12 }}>
              <PauseStat avg={data.pauses.avg_pauses_per_walk} direction={data.pauses.direction} />
            </div>
            <div style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.4 }}>
              {data.pauses.sentence}
            </div>
          </Card>
        </>
      )}

      {data.walk_fade && (
        <>
          <SectionLabel>Innerhalb eines Spaziergangs</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.4 }}>
              {data.walk_fade.sentence}
            </div>
          </Card>
        </>
      )}
```

- [ ] **Step 6: Run to verify pass**

Run: `pnpm -C webapp test && pnpm -C webapp lint && pnpm -C webapp build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/shared/types.ts webapp/src/shared/charts.tsx webapp/src/modes/relative/Patterns.tsx webapp/tests/shared/charts.test.tsx
git commit -m "feat(webapp): Tempo, Pausen, walk-fade blocks on Patterns screen"
```

---

### Task 7: Reseed, re-bake static API, full verification

**Files:**
- Modify: `data/hiptron.duckdb` (regenerated, not committed)
- Modify: `webapp/public/api/**/*.json` (re-baked, committed)

- [ ] **Step 1: Reseed + pipeline**

```bash
.venv/bin/python -m hiptron.synthetic seed --scenario all --replace
.venv/bin/python -m hiptron.pipeline run --stage all
```

- [ ] **Step 2: Verify persona stories on the live DB**

```bash
.venv/bin/python - <<'EOF'
from pathlib import Path
from hiptron.backend.queries import patterns_screen, relative_home

db = Path("data/hiptron.duckdb")
for u in ("helga", "otto", "margarete", "ingrid"):
    p = patterns_screen(db, u)
    ws = p.walking_speed
    ps = p.pauses
    wf = p.walk_fade
    print(u, relative_home(db, u).status,
          "| speed:", ws and (round(ws.this_kmh, 1), ws.direction),
          "| pauses:", ps and (ps.avg_pauses_per_walk, ps.direction),
          "| fade:", wf and (wf.this_delta_pct, wf.direction))
EOF
```

Expected: helga **amber**, speed `down` (~3–4 km/h), fade `down` (≤ −8); margarete **amber**, pauses `up` (≥ 1.5); otto **amber**, all three flat/quiet; ingrid **green**, all flat. If any amber/green flipped: the gait RNG separation leaked into the main stream — diff the generator changes against the plan's RNG rules before touching scenario knobs.

- [ ] **Step 3: Full test gates**

```bash
.venv/bin/python -m pytest tests/ -q
.venv/bin/ruff check hiptron tests && .venv/bin/mypy hiptron
pnpm -C webapp test && pnpm -C webapp lint && pnpm -C webapp build
```

Expected: all green. (Full pytest rebuilds the demo-db fixture, ~6 min.)

- [ ] **Step 4: Re-bake static API + sanity-check**

```bash
.venv/bin/python scripts/bake_static_api.py
grep -l "walking_speed" webapp/public/api/relative/patterns/*.json
```

Expected: all four persona JSONs listed; helga's contains `"direction": "down"` under `walking_speed`.

- [ ] **Step 5: Commit**

```bash
git add webapp/public/api/
git commit -m "chore(demo): re-bake static API with gait metrics"
```

---

## Verification checklist (final)

- [ ] pytest fully green (incl. new generator/patterns tests + `test_caregiver_status_invariant`)
- [ ] ruff + mypy clean
- [ ] vitest + eslint + build clean
- [ ] Baked JSON for all 4 personas contains `walking_speed`, `pauses`, `walk_fade`
- [ ] No "Ermüdung"/"Sturzrisiko"/diagnosis vocabulary anywhere in new UI strings; "fatigue" absent from API fields and UI
- [ ] OA mode untouched (no OA file modified)
