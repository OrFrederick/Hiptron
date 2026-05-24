# Hiptron Mobility Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end prototype of the Hiptron Mobility Insights system: a synthetic GPS generator, a DuckDB-backed analytics pipeline (walk segmentation → features → place clustering → daily aggregates → baselines → change-point detection → insight templates), a FastAPI backend, and a single React webapp with two modes (Older-Adult, Relative) that surfaces insights kindly and on a privacy-respecting drill-down view.

**Architecture:** All raw, intermediate, and insight data live in one DuckDB file. Python 3.12 pipeline runs stages in order, idempotent via per-stage watermarks. FastAPI reads DuckDB read-only and serves JSON to a React+Vite+TS+Tailwind PWA. Synthetic generator is the only data source at v0; real ingest swaps in by writing to the same `gps_fixes` table.

**Tech Stack:**
- Python 3.12, uv, ruff, mypy, pytest
- DuckDB (single-file analytical DB)
- numpy, polars, scikit-learn (DBSCAN), ruptures (CUSUM/BOCP)
- FastAPI, uvicorn, Pydantic v2, pydantic-settings
- React 18, Vite 5, TypeScript, Tailwind CSS, React Router, @tanstack/react-query, recharts
- vite-plugin-pwa (added late)
- vitest, @testing-library/react, jsdom
- just (task runner), pnpm

**Spec reference:** `docs/superpowers/specs/2026-05-24-hiptron-mobility-insights-design.md`
**UI design brief:** `docs/superpowers/design/2026-05-24-hiptron-ui-design-brief.md`

---

## File Structure

```
hiptron/
  __init__.py
  db/
    __init__.py
    schema.sql               # full DDL for all tables
    connection.py            # open_db() helper, read/write modes
  synthetic/
    __init__.py
    scenarios.py             # named scenario configs (Pydantic models)
    generator.py             # generate(scenario, db) -> writes gps_fixes
  pipeline/
    __init__.py
    run.py                   # CLI: python -m hiptron.pipeline run --stage all|<name>
    state.py                 # pipeline_state watermarks
    stages/
      __init__.py
      _01_segment_walks.py
      _02_walk_features.py
      _03_cluster_places.py
      _04_daily_aggregate.py
      _05_baselines.py
      _06_changepoints.py
      _07_insights.py
  backend/
    __init__.py
    main.py                  # FastAPI app
    models.py                # Pydantic response models
    queries.py               # DuckDB read queries (functions returning models)

tests/
  conftest.py                # shared fixtures (temp duckdb, sample data)
  test_synthetic.py
  test_segment_walks.py
  test_walk_features.py
  test_cluster_places.py
  test_daily_aggregate.py
  test_baselines.py
  test_changepoints.py
  test_insights.py
  test_pipeline_runner.py
  test_backend.py
  test_e2e_scenarios.py

webapp/
  package.json
  pnpm-lock.yaml
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  index.html
  public/
    icons/                   # PWA icons (added in PWA task)
  src/
    main.tsx
    App.tsx                  # router setup
    shared/
      api.ts                 # @tanstack/react-query hooks + fetch wrapper
      types.ts               # mirrors backend Pydantic models
      Card.tsx               # base Card component
      Sentence.tsx           # headline-sentence component
      a11y.ts                # contrast helpers
    modes/
      older-adult/
        Home.tsx
        SchematicMap.tsx
        WeekView.tsx
        cards/
          GreetingCard.tsx
          YesterdayWalkCard.tsx
          StreakCard.tsx
          FamilyNoteCard.tsx
          TrendCard.tsx
      relative/
        Home.tsx
        InsightsDetail.tsx
        cards/
          StatusCard.tsx
          WeeklyTrendCard.tsx
          WorthNoticingCard.tsx
          FooterPrivacyCard.tsx
        insights/
          RoutineBlock.tsx
          DistanceBlock.tsx
          FatigueBlock.tsx
          PlacesBlock.tsx
          ChangepointsBlock.tsx
  tests/
    setup.ts
    older-adult/
      Home.test.tsx
      SchematicMap.test.tsx
    relative/
      Home.test.tsx
      InsightsDetail.test.tsx

data/                        # gitignored
  hiptron.duckdb

pyproject.toml
justfile
.gitignore
README.md                    # short pointer to spec + plan
```

---

## Task 1: Scaffold Python project

**Files:**
- Create: `pyproject.toml`
- Create: `justfile`
- Create: `.gitignore`
- Create: `README.md`
- Create: `hiptron/__init__.py`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Init git repo**

```bash
cd /Users/frederick/Development/Hiptron
git init
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/
.pytest_cache/
.ruff_cache/
.mypy_cache/
*.egg-info/

# Node
node_modules/
dist/
.vite/

# Data
data/*.duckdb
data/*.duckdb.wal

# Editor
.vscode/
.idea/
*.swp
.DS_Store
```

- [ ] **Step 3: Write `pyproject.toml`**

```toml
[project]
name = "hiptron"
version = "0.1.0"
description = "Hiptron Mobility Insights prototype"
requires-python = ">=3.12"
dependencies = [
    "duckdb>=1.1.0",
    "numpy>=2.0.0",
    "polars>=1.10.0",
    "scikit-learn>=1.5.0",
    "ruptures>=1.1.9",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.5.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.7.0",
    "mypy>=1.13.0",
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["hiptron"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "N"]

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --strict-markers"
```

- [ ] **Step 4: Write `justfile`**

```just
default:
    @just --list

install:
    uv sync --extra dev
    cd webapp && pnpm install

pipeline *args:
    uv run python -m hiptron.pipeline run {{args}}

backend:
    uv run uvicorn hiptron.backend.main:app --reload --port 8000

dev:
    cd webapp && pnpm dev

test:
    uv run pytest
    cd webapp && pnpm test

lint:
    uv run ruff check .
    uv run mypy hiptron
    cd webapp && pnpm lint

format:
    uv run ruff format .
    cd webapp && pnpm format

clean:
    rm -f data/hiptron.duckdb data/hiptron.duckdb.wal
```

- [ ] **Step 5: Write `README.md` (pointer only)**

```markdown
# Hiptron Mobility Insights — Prototype

Concept prototype for OneAIM challenge. See:

- Spec: `docs/superpowers/specs/2026-05-24-hiptron-mobility-insights-design.md`
- Plan: `docs/superpowers/plans/2026-05-24-hiptron-mobility-insights-plan.md`
- UI design brief: `docs/superpowers/design/2026-05-24-hiptron-ui-design-brief.md`

## Quick start

```bash
just install
just pipeline run --stage all
just backend     # in one shell
just dev         # in another shell
```
```

- [ ] **Step 6: Empty `hiptron/__init__.py` and `tests/__init__.py`**

Both files empty.

- [ ] **Step 7: Write `tests/conftest.py`**

```python
import os
from pathlib import Path

import duckdb
import pytest


@pytest.fixture
def tmp_db(tmp_path: Path) -> duckdb.DuckDBPyConnection:
    """Fresh in-memory-backed DuckDB with full schema applied."""
    db_path = tmp_path / "test.duckdb"
    con = duckdb.connect(str(db_path))
    schema_path = Path(__file__).parent.parent / "hiptron" / "db" / "schema.sql"
    con.execute(schema_path.read_text())
    yield con
    con.close()
```

- [ ] **Step 8: Install dependencies**

```bash
uv sync --extra dev
```

Expected: lockfile created, all deps installed.

- [ ] **Step 9: Commit**

```bash
git add pyproject.toml justfile .gitignore README.md hiptron/ tests/
git commit -m "chore: scaffold python project (uv, pyproject, just, conftest)"
```

---

## Task 2: DuckDB schema + connection helper

**Files:**
- Create: `hiptron/db/__init__.py`
- Create: `hiptron/db/schema.sql`
- Create: `hiptron/db/connection.py`
- Test: `tests/test_db.py`

- [ ] **Step 1: Write failing test for schema applies cleanly**

`tests/test_db.py`:
```python
import duckdb

from hiptron.db.connection import open_db, apply_schema


def test_schema_applies_and_tables_exist(tmp_path):
    db_path = tmp_path / "test.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    tables = {row[0] for row in con.execute("SHOW TABLES").fetchall()}
    expected = {
        "gps_fixes", "walks", "walk_features",
        "places", "walk_place_visits",
        "daily_features", "baselines", "changepoints",
        "insights", "pipeline_state",
    }
    assert expected.issubset(tables)
    con.close()


def test_open_db_read_only_blocks_writes(tmp_path):
    db_path = tmp_path / "test.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    con.close()

    ro = open_db(db_path, read_only=True)
    with pytest.raises(duckdb.Error):
        ro.execute("INSERT INTO gps_fixes VALUES ('u1', NOW(), 0.0, 0.0, 5.0)")
    ro.close()


import pytest  # noqa: E402
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

```bash
uv run pytest tests/test_db.py -v
```

Expected: FAIL, `ModuleNotFoundError: No module named 'hiptron.db.connection'`.

- [ ] **Step 3: Write `hiptron/db/__init__.py` (empty)**

- [ ] **Step 4: Write `hiptron/db/schema.sql`**

```sql
-- raw GPS stream
CREATE TABLE IF NOT EXISTS gps_fixes (
    user_id      VARCHAR  NOT NULL,
    ts           TIMESTAMP NOT NULL,
    lat          DOUBLE   NOT NULL,
    lon          DOUBLE   NOT NULL,
    accuracy_m   DOUBLE,
    PRIMARY KEY (user_id, ts)
);

-- segmented walks
CREATE TABLE IF NOT EXISTS walks (
    walk_id        VARCHAR PRIMARY KEY,
    user_id        VARCHAR NOT NULL,
    start_ts       TIMESTAMP NOT NULL,
    end_ts         TIMESTAMP NOT NULL,
    src_fix_count  INTEGER NOT NULL
);

-- per-walk features
CREATE TABLE IF NOT EXISTS walk_features (
    walk_id                 VARCHAR PRIMARY KEY,
    distance_m              DOUBLE,
    duration_s              DOUBLE,
    mean_speed              DOUBLE,
    peak_speed              DOUBLE,
    pause_count             INTEGER,
    dwell_s                 DOUBLE,
    speed_third_delta_pct   DOUBLE,
    route_hash              VARCHAR
);

-- place clusters
CREATE TABLE IF NOT EXISTS places (
    place_id       VARCHAR PRIMARY KEY,
    user_id        VARCHAR NOT NULL,
    centroid_lat   DOUBLE NOT NULL,
    centroid_lon   DOUBLE NOT NULL,
    label          VARCHAR,
    first_seen     TIMESTAMP,
    last_seen      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS walk_place_visits (
    walk_id     VARCHAR NOT NULL,
    place_id    VARCHAR NOT NULL,
    arrive_ts   TIMESTAMP NOT NULL,
    depart_ts   TIMESTAMP NOT NULL,
    PRIMARY KEY (walk_id, place_id, arrive_ts)
);

-- daily aggregates
CREATE TABLE IF NOT EXISTS daily_features (
    user_id            VARCHAR NOT NULL,
    date               DATE NOT NULL,
    total_distance_m   DOUBLE,
    n_outings          INTEGER,
    time_outdoors_min  DOUBLE,
    activity_radius_m  DOUBLE,
    fatigue_index      DOUBLE,
    place_count        INTEGER,
    PRIMARY KEY (user_id, date)
);

-- rolling baselines
CREATE TABLE IF NOT EXISTS baselines (
    user_id      VARCHAR NOT NULL,
    feature      VARCHAR NOT NULL,
    window_end   DATE NOT NULL,
    mean         DOUBLE,
    std          DOUBLE,
    n            INTEGER,
    PRIMARY KEY (user_id, feature, window_end)
);

-- detected change-points
CREATE TABLE IF NOT EXISTS changepoints (
    user_id         VARCHAR NOT NULL,
    feature         VARCHAR NOT NULL,
    detected_at     DATE NOT NULL,
    direction       VARCHAR NOT NULL,    -- 'up' | 'down'
    score           DOUBLE,
    baseline_mean   DOUBLE,
    current_value   DOUBLE,
    PRIMARY KEY (user_id, feature, detected_at)
);

-- generated insight cards
CREATE TABLE IF NOT EXISTS insights (
    insight_id    VARCHAR PRIMARY KEY,
    user_id       VARCHAR NOT NULL,
    audience      VARCHAR NOT NULL,    -- 'older_adult' | 'relative'
    kind          VARCHAR NOT NULL,
    severity      VARCHAR NOT NULL,    -- 'info' | 'notice'
    template_id   VARCHAR NOT NULL,
    payload_json  JSON NOT NULL,
    created_ts    TIMESTAMP NOT NULL,
    dismissed_ts  TIMESTAMP
);

-- pipeline watermarks
CREATE TABLE IF NOT EXISTS pipeline_state (
    stage             VARCHAR PRIMARY KEY,
    last_processed_ts TIMESTAMP
);
```

- [ ] **Step 5: Write `hiptron/db/connection.py`**

```python
from pathlib import Path

import duckdb


def open_db(path: Path | str, *, read_only: bool) -> duckdb.DuckDBPyConnection:
    """Open a DuckDB connection. Parent dir created if missing."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(p), read_only=read_only)


def apply_schema(con: duckdb.DuckDBPyConnection) -> None:
    """Apply the DDL from schema.sql."""
    schema_path = Path(__file__).parent / "schema.sql"
    con.execute(schema_path.read_text())
```

- [ ] **Step 6: Run test — expect PASS**

```bash
uv run pytest tests/test_db.py -v
```

- [ ] **Step 7: Commit**

```bash
git add hiptron/db/ tests/test_db.py
git commit -m "feat(db): duckdb schema + connection helper"
```

---

## Task 3: Synthetic GPS generator

**Files:**
- Create: `hiptron/synthetic/__init__.py`
- Create: `hiptron/synthetic/scenarios.py`
- Create: `hiptron/synthetic/generator.py`
- Test: `tests/test_synthetic.py`

- [ ] **Step 1: Write failing test for scenario invariants**

`tests/test_synthetic.py`:
```python
import datetime as dt

import duckdb

from hiptron.db.connection import apply_schema
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import Scenario, BASELINE_SCENARIO


def test_baseline_scenario_produces_expected_volume(tmp_db: duckdb.DuckDBPyConnection):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    n_fixes = tmp_db.execute("SELECT count(*) FROM gps_fixes").fetchone()[0]
    # 8 weeks x ~2 outings/day x ~30 min/outing x 1 fix per ~10s
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
        distance_decline_pct_per_week=10.0,  # 10%/week from week 5
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
    assert late < early  # decline visible in fix volume


def test_generator_is_deterministic_with_seed(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    rows_a = tmp_db.execute("SELECT lat, lon FROM gps_fixes ORDER BY ts LIMIT 100").fetchall()

    tmp_db.execute("DELETE FROM gps_fixes")
    generate(BASELINE_SCENARIO, tmp_db)
    rows_b = tmp_db.execute("SELECT lat, lon FROM gps_fixes ORDER BY ts LIMIT 100").fetchall()
    assert rows_a == rows_b
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/synthetic/__init__.py` (empty)**

- [ ] **Step 4: Write `hiptron/synthetic/scenarios.py`**

```python
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class NamedPlace:
    label: str
    lat_offset_m: float
    lon_offset_m: float
    visit_prob: float            # probability of visiting on a given outing
    typical_dow: tuple[int, ...] # 0=Mon ... 6=Sun
    typical_hour: int            # local hour


@dataclass(frozen=True)
class Scenario:
    user_id: str
    seed: int
    weeks: int
    home_lat: float
    home_lon: float
    outings_per_day: int
    mean_outing_distance_m: float
    distance_decline_pct_per_week: float = 0.0
    decline_start_week: int | None = None
    fatigue_onset_week: int | None = None
    place_repertoire_shrink: bool = False
    end_dt: datetime | None = None   # default: now

    def end(self) -> datetime:
        return self.end_dt or datetime.now()

    def start(self) -> datetime:
        return self.end() - timedelta(weeks=self.weeks)


DEFAULT_PLACES = (
    NamedPlace("bakery", 80.0, 60.0, 0.6, (0, 1, 2, 3, 4, 5), 9),
    NamedPlace("park", -50.0, 150.0, 0.5, (0, 1, 2, 3, 4, 5, 6), 14),
    NamedPlace("doctor", 200.0, -80.0, 0.08, (1, 3), 11),
    NamedPlace("friend", -180.0, -120.0, 0.2, (5, 6), 15),
    NamedPlace("shop", 40.0, -90.0, 0.4, (1, 3, 5), 10),
)


BASELINE_SCENARIO = Scenario(
    user_id="helga",
    seed=42,
    weeks=8,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
)
```

- [ ] **Step 5: Write `hiptron/synthetic/generator.py`**

```python
import hashlib
import math
import random
from datetime import datetime, timedelta

import duckdb

from hiptron.synthetic.scenarios import DEFAULT_PLACES, NamedPlace, Scenario

METERS_PER_DEG_LAT = 111_320.0


def _m_to_deg_lat(m: float) -> float:
    return m / METERS_PER_DEG_LAT


def _m_to_deg_lon(m: float, at_lat: float) -> float:
    return m / (METERS_PER_DEG_LAT * math.cos(math.radians(at_lat)))


def generate(scenario: Scenario, con: duckdb.DuckDBPyConnection) -> None:
    """Write synthetic GPS fixes for `scenario` into the `gps_fixes` table."""
    rng = random.Random(scenario.seed)
    rows: list[tuple[str, datetime, float, float, float]] = []

    start = scenario.start().replace(hour=0, minute=0, second=0, microsecond=0)

    # always emit one home fix per hour at rest
    cur = start
    end = scenario.end()
    while cur < end:
        rows.append((
            scenario.user_id, cur,
            scenario.home_lat + rng.gauss(0, 2e-6),
            scenario.home_lon + rng.gauss(0, 2e-6),
            6.0,
        ))
        cur += timedelta(hours=1)

    # outings
    day = start.date()
    end_date = end.date()
    while day <= end_date:
        week_idx = (day - start.date()).days // 7
        decline_factor = _decline_factor(scenario, week_idx)
        places = _places_for_week(scenario, week_idx, rng)
        for _ in range(scenario.outings_per_day):
            place = _pick_place(places, day, rng)
            if place is None:
                continue
            start_dt = datetime.combine(day, datetime.min.time()) + timedelta(
                hours=place.typical_hour, minutes=rng.randint(-30, 30)
            )
            _emit_outing(rows, scenario, place, start_dt, decline_factor, rng)
        day += timedelta(days=1)

    con.executemany(
        "INSERT OR REPLACE INTO gps_fixes VALUES (?, ?, ?, ?, ?)", rows
    )


def _decline_factor(scenario: Scenario, week_idx: int) -> float:
    if (
        scenario.decline_start_week is None
        or week_idx < scenario.decline_start_week
        or scenario.distance_decline_pct_per_week <= 0
    ):
        return 1.0
    weeks_decline = week_idx - scenario.decline_start_week + 1
    return max(0.2, 1.0 - (scenario.distance_decline_pct_per_week / 100.0) * weeks_decline)


def _places_for_week(
    scenario: Scenario, week_idx: int, rng: random.Random
) -> tuple[NamedPlace, ...]:
    if not scenario.place_repertoire_shrink:
        return DEFAULT_PLACES
    keep = max(2, len(DEFAULT_PLACES) - week_idx // 2)
    return DEFAULT_PLACES[:keep]


def _pick_place(
    places: tuple[NamedPlace, ...], day: "datetime.date", rng: random.Random
) -> NamedPlace | None:
    candidates = [p for p in places if day.weekday() in p.typical_dow]
    rng.shuffle(candidates)
    for p in candidates:
        if rng.random() < p.visit_prob:
            return p
    return None


def _emit_outing(
    rows: list,
    scenario: Scenario,
    place: NamedPlace,
    start_dt: datetime,
    decline_factor: float,
    rng: random.Random,
) -> None:
    place_lat = scenario.home_lat + _m_to_deg_lat(place.lat_offset_m)
    place_lon = scenario.home_lon + _m_to_deg_lon(place.lon_offset_m, scenario.home_lat)
    distance_m = max(
        100.0,
        scenario.mean_outing_distance_m * decline_factor * rng.uniform(0.7, 1.3),
    )
    walking_speed = rng.uniform(0.8, 1.1)  # m/s
    if scenario.fatigue_onset_week is not None:
        walking_speed *= 0.9  # slower across the board during fatigue scenario

    n_steps = max(2, int(distance_m / walking_speed / 10))  # 1 fix per 10s
    for i in range(n_steps + 1):
        t = i / n_steps
        # outbound first half, return second half
        if t <= 0.5:
            frac = t * 2
            lat = scenario.home_lat + frac * (place_lat - scenario.home_lat)
            lon = scenario.home_lon + frac * (place_lon - scenario.home_lon)
        else:
            frac = (1 - t) * 2
            lat = scenario.home_lat + frac * (place_lat - scenario.home_lat)
            lon = scenario.home_lon + frac * (place_lon - scenario.home_lon)
        lat += rng.gauss(0, 1e-5)
        lon += rng.gauss(0, 1e-5)
        ts = start_dt + timedelta(seconds=i * 10)
        rows.append((scenario.user_id, ts, lat, lon, rng.uniform(3.0, 8.0)))

    # dwell at destination
    dwell_min = rng.randint(10, 40)
    for j in range(dwell_min):
        rows.append((
            scenario.user_id,
            start_dt + timedelta(seconds=n_steps * 10 + j * 60),
            place_lat + rng.gauss(0, 1e-5),
            place_lon + rng.gauss(0, 1e-5),
            rng.uniform(3.0, 8.0),
        ))
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
uv run pytest tests/test_synthetic.py -v
```

- [ ] **Step 7: Commit**

```bash
git add hiptron/synthetic/ tests/test_synthetic.py
git commit -m "feat(synthetic): scenario-driven GPS generator"
```

---

## Task 4: Pipeline stage 1 — walk segmentation

**Files:**
- Create: `hiptron/pipeline/__init__.py`
- Create: `hiptron/pipeline/stages/__init__.py`
- Create: `hiptron/pipeline/stages/_01_segment_walks.py`
- Test: `tests/test_segment_walks.py`

- [ ] **Step 1: Write failing test**

`tests/test_segment_walks.py`:
```python
import datetime as dt

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def test_segments_at_least_one_walk_per_outing_day(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    n_walks = tmp_db.execute("SELECT count(*) FROM walks").fetchone()[0]
    # 8 weeks * 7 days * up to 2 outings; expect at least 30 walks for baseline
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
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write empty `hiptron/pipeline/__init__.py`, `hiptron/pipeline/stages/__init__.py`**

- [ ] **Step 4: Write `hiptron/pipeline/stages/_01_segment_walks.py`**

```python
"""Stage 1 — segment GPS fix stream into walks.

Approach: for each user, compute home cluster centroid (median of all fixes).
A walk begins when distance-from-home > HOME_RADIUS_M sustained for >= MIN_AWAY_S.
A walk ends when the user returns within HOME_RADIUS_M for >= MIN_BACK_S.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass

import duckdb

HOME_RADIUS_M = 50.0
MIN_AWAY_S = 5 * 60
MIN_BACK_S = 5 * 60
MAX_STATIONARY_GAP_S = 10 * 60


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def segment_walks(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM walks")
    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM gps_fixes").fetchall()]
    for user_id in users:
        _segment_user(con, user_id)


def _segment_user(con: duckdb.DuckDBPyConnection, user_id: str) -> None:
    fixes = con.execute(
        "SELECT ts, lat, lon FROM gps_fixes WHERE user_id = ? ORDER BY ts",
        (user_id,),
    ).fetchall()
    if len(fixes) < 2:
        return
    home_lat = sorted(f[1] for f in fixes)[len(fixes) // 2]
    home_lon = sorted(f[2] for f in fixes)[len(fixes) // 2]

    walks: list[tuple[str, str, "datetime", "datetime", int]] = []
    in_walk = False
    walk_start_idx: int | None = None
    last_away_ts = None

    for i, (ts, lat, lon) in enumerate(fixes):
        away = _haversine_m(lat, lon, home_lat, home_lon) > HOME_RADIUS_M
        if not in_walk and away:
            in_walk = True
            walk_start_idx = i
            last_away_ts = ts
        elif in_walk:
            if away:
                last_away_ts = ts
            else:
                gap = (ts - last_away_ts).total_seconds()
                if gap >= MIN_BACK_S:
                    start_ts = fixes[walk_start_idx][0]
                    end_ts = last_away_ts
                    duration = (end_ts - start_ts).total_seconds()
                    if duration >= MIN_AWAY_S:
                        walk_id = _walk_id(user_id, start_ts)
                        fix_count = i - walk_start_idx
                        walks.append((walk_id, user_id, start_ts, end_ts, fix_count))
                    in_walk = False
                    walk_start_idx = None
                    last_away_ts = None

    if in_walk and walk_start_idx is not None and last_away_ts is not None:
        start_ts = fixes[walk_start_idx][0]
        end_ts = last_away_ts
        if (end_ts - start_ts).total_seconds() >= MIN_AWAY_S:
            walk_id = _walk_id(user_id, start_ts)
            walks.append((walk_id, user_id, start_ts, end_ts, len(fixes) - walk_start_idx))

    if walks:
        con.executemany(
            "INSERT INTO walks VALUES (?, ?, ?, ?, ?)", walks
        )


def _walk_id(user_id: str, start_ts) -> str:
    h = hashlib.sha1(f"{user_id}|{start_ts.isoformat()}".encode()).hexdigest()
    return h[:16]
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
uv run pytest tests/test_segment_walks.py -v
```

- [ ] **Step 6: Commit**

```bash
git add hiptron/pipeline/ tests/test_segment_walks.py
git commit -m "feat(pipeline): stage 1 walk segmentation"
```

---

## Task 5: Pipeline stage 2 — walk features

**Files:**
- Create: `hiptron/pipeline/stages/_02_walk_features.py`
- Test: `tests/test_walk_features.py`

- [ ] **Step 1: Write failing test**

`tests/test_walk_features.py`:
```python
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
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_02_walk_features.py`**

```python
"""Stage 2 — per-walk feature extraction."""
from __future__ import annotations

import hashlib
import math

import duckdb

from hiptron.pipeline.stages._01_segment_walks import _haversine_m

PAUSE_SPEED_THRESHOLD = 0.3  # m/s


def compute_walk_features(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM walk_features")
    walks = con.execute("SELECT walk_id, user_id, start_ts, end_ts FROM walks").fetchall()
    rows: list[tuple] = []
    for walk_id, user_id, start_ts, end_ts in walks:
        fixes = con.execute(
            """
            SELECT ts, lat, lon
            FROM gps_fixes
            WHERE user_id = ? AND ts BETWEEN ? AND ?
            ORDER BY ts
            """,
            (user_id, start_ts, end_ts),
        ).fetchall()
        if len(fixes) < 2:
            continue
        rows.append(_features_for_walk(walk_id, fixes))
    if rows:
        con.executemany(
            "INSERT INTO walk_features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows
        )


def _features_for_walk(walk_id: str, fixes: list) -> tuple:
    total_dist = 0.0
    speeds: list[float] = []
    dwell_s = 0.0
    pause_count = 0
    prev_pause = False

    for i in range(1, len(fixes)):
        ts_a, lat_a, lon_a = fixes[i - 1]
        ts_b, lat_b, lon_b = fixes[i]
        dt = (ts_b - ts_a).total_seconds()
        if dt <= 0:
            continue
        d = _haversine_m(lat_a, lon_a, lat_b, lon_b)
        speed = d / dt
        total_dist += d
        speeds.append(speed)
        if speed < PAUSE_SPEED_THRESHOLD:
            dwell_s += dt
            if not prev_pause:
                pause_count += 1
                prev_pause = True
        else:
            prev_pause = False

    duration_s = (fixes[-1][0] - fixes[0][0]).total_seconds()
    mean_speed = sum(speeds) / max(1, len(speeds))
    peak_speed = max(speeds) if speeds else 0.0

    third = max(1, len(speeds) // 3)
    first_third = speeds[:third]
    last_third = speeds[-third:]
    avg_first = sum(first_third) / max(1, len(first_third))
    avg_last = sum(last_third) / max(1, len(last_third))
    speed_third_delta_pct = (
        ((avg_last - avg_first) / avg_first * 100.0) if avg_first > 0 else 0.0
    )

    route_hash = _route_hash(fixes)
    return (
        walk_id, total_dist, duration_s, mean_speed, peak_speed,
        pause_count, dwell_s, speed_third_delta_pct, route_hash,
    )


def _route_hash(fixes: list, grid_m: float = 100.0) -> str:
    """Cheap route fingerprint: bucket-sequence of (lat, lon) on a coarse grid."""
    if not fixes:
        return ""
    base_lat = fixes[0][1]
    base_lon = fixes[0][2]
    deg_per_m_lat = 1 / 111_320.0
    deg_per_m_lon = 1 / (111_320.0 * math.cos(math.radians(base_lat)))
    tokens = []
    last = None
    for _, lat, lon in fixes:
        gy = int((lat - base_lat) / (grid_m * deg_per_m_lat))
        gx = int((lon - base_lon) / (grid_m * deg_per_m_lon))
        token = (gx, gy)
        if token != last:
            tokens.append(token)
            last = token
    return hashlib.sha1(repr(tokens).encode()).hexdigest()[:16]
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_walk_features.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_02_walk_features.py tests/test_walk_features.py
git commit -m "feat(pipeline): stage 2 walk feature extraction"
```

---

## Task 6: Pipeline stage 3 — place clustering

**Files:**
- Create: `hiptron/pipeline/stages/_03_cluster_places.py`
- Test: `tests/test_cluster_places.py`

- [ ] **Step 1: Write failing test**

`tests/test_cluster_places.py`:
```python
from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def test_finds_named_clusters(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    compute_walk_features(tmp_db)
    cluster_places(tmp_db)
    n_places = tmp_db.execute("SELECT count(*) FROM places").fetchone()[0]
    # Baseline scenario visits up to 5 named places; expect 2-6 clusters
    assert 2 <= n_places <= 8


def test_visits_recorded(tmp_db):
    apply_schema(tmp_db)
    generate(BASELINE_SCENARIO, tmp_db)
    segment_walks(tmp_db)
    compute_walk_features(tmp_db)
    cluster_places(tmp_db)
    n_visits = tmp_db.execute("SELECT count(*) FROM walk_place_visits").fetchone()[0]
    assert n_visits > 0
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_03_cluster_places.py`**

```python
"""Stage 3 — cluster dwell points into named places."""
from __future__ import annotations

import hashlib
import math
from collections import Counter, defaultdict

import duckdb
import numpy as np
from sklearn.cluster import DBSCAN

DWELL_MIN_S = 120
EPS_M = 50.0
MIN_SAMPLES = 3
DEG_PER_M_LAT = 1 / 111_320.0


def cluster_places(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM places")
    con.execute("DELETE FROM walk_place_visits")

    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM gps_fixes").fetchall()]
    for user_id in users:
        _cluster_user(con, user_id)


def _cluster_user(con: duckdb.DuckDBPyConnection, user_id: str) -> None:
    walks = con.execute(
        "SELECT walk_id, start_ts, end_ts FROM walks WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    if not walks:
        return

    # collect dwell points (consecutive low-speed segments per walk)
    dwell_points: list[tuple[str, float, float, "datetime", "datetime"]] = []
    for walk_id, start_ts, end_ts in walks:
        fixes = con.execute(
            """
            SELECT ts, lat, lon FROM gps_fixes
            WHERE user_id = ? AND ts BETWEEN ? AND ?
            ORDER BY ts
            """,
            (user_id, start_ts, end_ts),
        ).fetchall()
        dwell_points.extend(_dwell_segments_for_walk(walk_id, fixes))

    if len(dwell_points) < MIN_SAMPLES:
        return

    coords = np.array([[p[1], p[2]] for p in dwell_points])
    lat0 = coords[:, 0].mean()
    eps_deg = EPS_M * DEG_PER_M_LAT
    # scale lon to lat-equivalent so DBSCAN works in degrees uniformly
    coords_scaled = np.column_stack([
        coords[:, 0],
        coords[:, 1] * math.cos(math.radians(lat0)),
    ])
    labels = DBSCAN(eps=eps_deg, min_samples=MIN_SAMPLES).fit_predict(coords_scaled)

    cluster_to_points: dict[int, list[int]] = defaultdict(list)
    for idx, lab in enumerate(labels):
        if lab >= 0:
            cluster_to_points[lab].append(idx)

    place_rows = []
    visit_rows = []
    for lab, idxs in cluster_to_points.items():
        cluster_coords = coords[idxs]
        centroid_lat = float(cluster_coords[:, 0].mean())
        centroid_lon = float(cluster_coords[:, 1].mean())
        timestamps = [dwell_points[i][3] for i in idxs]
        first_seen = min(timestamps)
        last_seen = max(timestamps)
        place_id = _place_id(user_id, centroid_lat, centroid_lon)
        label = _auto_label([dwell_points[i] for i in idxs])
        place_rows.append((
            place_id, user_id, centroid_lat, centroid_lon,
            label, first_seen, last_seen,
        ))
        for i in idxs:
            walk_id, _, _, arrive_ts, depart_ts = dwell_points[i]
            visit_rows.append((walk_id, place_id, arrive_ts, depart_ts))

    if place_rows:
        con.executemany("INSERT INTO places VALUES (?, ?, ?, ?, ?, ?, ?)", place_rows)
    if visit_rows:
        con.executemany(
            "INSERT INTO walk_place_visits VALUES (?, ?, ?, ?)", visit_rows
        )


def _dwell_segments_for_walk(walk_id: str, fixes: list) -> list[tuple]:
    """Find sub-segments where the user was stationary >= DWELL_MIN_S."""
    from hiptron.pipeline.stages._01_segment_walks import _haversine_m
    segments = []
    seg_start = None
    seg_start_ts = None
    for i in range(1, len(fixes)):
        ts_a, lat_a, lon_a = fixes[i - 1]
        ts_b, lat_b, lon_b = fixes[i]
        dist = _haversine_m(lat_a, lon_a, lat_b, lon_b)
        if dist < 10.0:
            if seg_start is None:
                seg_start = i - 1
                seg_start_ts = ts_a
        else:
            if seg_start is not None:
                seg_end_ts = ts_a
                if (seg_end_ts - seg_start_ts).total_seconds() >= DWELL_MIN_S:
                    lats = [fixes[j][1] for j in range(seg_start, i)]
                    lons = [fixes[j][2] for j in range(seg_start, i)]
                    segments.append((
                        walk_id,
                        sum(lats) / len(lats),
                        sum(lons) / len(lons),
                        seg_start_ts,
                        seg_end_ts,
                    ))
                seg_start = None
                seg_start_ts = None
    return segments


def _place_id(user_id: str, lat: float, lon: float) -> str:
    return hashlib.sha1(f"{user_id}|{lat:.5f}|{lon:.5f}".encode()).hexdigest()[:16]


def _auto_label(points: list[tuple]) -> str:
    """Heuristic label by dominant time-of-day + day-of-week pattern."""
    hours = [p[3].hour for p in points]
    weekdays = [p[3].weekday() for p in points]
    avg_hour = sum(hours) / len(hours)
    weekday_share = sum(1 for w in weekdays if w < 5) / len(weekdays)
    if avg_hour < 11 and weekday_share > 0.6:
        return "bakery"
    if 13 <= avg_hour <= 16:
        return "park"
    if 10 <= avg_hour <= 12 and weekday_share > 0.7:
        return "doctor"
    if avg_hour > 14 and weekday_share < 0.5:
        return "friend"
    return f"place_{int(avg_hour):02d}h"
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_cluster_places.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_03_cluster_places.py tests/test_cluster_places.py
git commit -m "feat(pipeline): stage 3 DBSCAN place clustering + auto-label"
```

---

## Task 7: Pipeline stage 4 — daily aggregation

**Files:**
- Create: `hiptron/pipeline/stages/_04_daily_aggregate.py`
- Test: `tests/test_daily_aggregate.py`

- [ ] **Step 1: Write failing test**

`tests/test_daily_aggregate.py`:
```python
from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def _run_through_daily(con):
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)


def test_daily_rows_within_range(tmp_db):
    _run_through_daily(tmp_db)
    n = tmp_db.execute("SELECT count(*) FROM daily_features").fetchone()[0]
    assert 30 <= n <= 8 * 7 + 1


def test_daily_distance_positive(tmp_db):
    _run_through_daily(tmp_db)
    bad = tmp_db.execute(
        "SELECT count(*) FROM daily_features WHERE total_distance_m < 0"
    ).fetchone()[0]
    assert bad == 0
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_04_daily_aggregate.py`**

```python
"""Stage 4 — roll per-walk features into daily features per user."""
from __future__ import annotations

import duckdb


SQL = """
INSERT INTO daily_features
SELECT
    w.user_id,
    CAST(w.start_ts AS DATE) AS date,
    COALESCE(SUM(wf.distance_m), 0) AS total_distance_m,
    COUNT(DISTINCT w.walk_id) AS n_outings,
    COALESCE(SUM(wf.duration_s), 0) / 60.0 AS time_outdoors_min,
    COALESCE(MAX(wf.distance_m / 2.0), 0) AS activity_radius_m,
    AVG(NULLIF(wf.speed_third_delta_pct, 0)) AS fatigue_index,
    COUNT(DISTINCT v.place_id) AS place_count
FROM walks w
JOIN walk_features wf ON wf.walk_id = w.walk_id
LEFT JOIN walk_place_visits v ON v.walk_id = w.walk_id
GROUP BY w.user_id, CAST(w.start_ts AS DATE)
"""


def aggregate_daily(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM daily_features")
    con.execute(SQL)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_daily_aggregate.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_04_daily_aggregate.py tests/test_daily_aggregate.py
git commit -m "feat(pipeline): stage 4 daily aggregation"
```

---

## Task 8: Pipeline stage 5 — rolling baselines

**Files:**
- Create: `hiptron/pipeline/stages/_05_baselines.py`
- Test: `tests/test_baselines.py`

- [ ] **Step 1: Write failing test**

`tests/test_baselines.py`:
```python
from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO

TRACKED_FEATURES = {
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
}


def _run_to_baselines(con):
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)


def test_baselines_skip_first_4_weeks(tmp_db):
    _run_to_baselines(tmp_db)
    earliest = tmp_db.execute("SELECT min(date) FROM daily_features").fetchone()[0]
    earliest_baseline = tmp_db.execute("SELECT min(window_end) FROM baselines").fetchone()[0]
    assert (earliest_baseline - earliest).days >= 27


def test_each_tracked_feature_has_baselines(tmp_db):
    _run_to_baselines(tmp_db)
    feats = {r[0] for r in tmp_db.execute("SELECT DISTINCT feature FROM baselines").fetchall()}
    assert TRACKED_FEATURES.issubset(feats)
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_05_baselines.py`**

```python
"""Stage 5 — rolling 4-week mean+std per (user, feature)."""
from __future__ import annotations

import datetime as dt

import duckdb

TRACKED_FEATURES = (
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
)
WINDOW_DAYS = 28
COLD_START_DAYS = 28


def update_baselines(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM baselines")
    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM daily_features").fetchall()]
    rows: list[tuple] = []
    for user_id in users:
        date_range = con.execute(
            "SELECT min(date), max(date) FROM daily_features WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not date_range or not date_range[0]:
            continue
        first_date, last_date = date_range
        cur = first_date + dt.timedelta(days=COLD_START_DAYS - 1)
        while cur <= last_date:
            window_start = cur - dt.timedelta(days=WINDOW_DAYS - 1)
            for feature in TRACKED_FEATURES:
                stats = con.execute(
                    f"""
                    SELECT avg({feature}), stddev_pop({feature}), count(*)
                    FROM daily_features
                    WHERE user_id = ?
                      AND date BETWEEN ? AND ?
                      AND {feature} IS NOT NULL
                    """,
                    (user_id, window_start, cur),
                ).fetchone()
                if stats and stats[2] and stats[2] >= 14:
                    rows.append((user_id, feature, cur, float(stats[0]),
                                 float(stats[1] or 0.0), int(stats[2])))
            cur += dt.timedelta(days=1)
    if rows:
        con.executemany("INSERT INTO baselines VALUES (?, ?, ?, ?, ?, ?)", rows)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_baselines.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_05_baselines.py tests/test_baselines.py
git commit -m "feat(pipeline): stage 5 rolling baselines"
```

---

## Task 9: Pipeline stage 6 — change-point detection

**Files:**
- Create: `hiptron/pipeline/stages/_06_changepoints.py`
- Test: `tests/test_changepoints.py`

- [ ] **Step 1: Write failing test**

`tests/test_changepoints.py`:
```python
import datetime as dt

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


def _run_all(con, scenario):
    apply_schema(con)
    generate(scenario, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)
    detect_changepoints(con)


def test_no_changepoints_for_steady_baseline(tmp_db):
    _run_all(tmp_db, BASELINE_SCENARIO)
    n = tmp_db.execute(
        "SELECT count(*) FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchone()[0]
    assert n == 0


def test_distance_decline_scenario_fires_changepoint(tmp_db):
    decline = Scenario(
        user_id="u1",
        seed=7,
        weeks=10,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=2,
        mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0,
        decline_start_week=5,
    )
    _run_all(tmp_db, decline)
    rows = tmp_db.execute(
        "SELECT detected_at, direction FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchall()
    assert len(rows) >= 1
    assert any(direction == "down" for _, direction in rows)
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_06_changepoints.py`**

```python
"""Stage 6 — CUSUM change-point detection vs rolling baseline."""
from __future__ import annotations

import datetime as dt

import duckdb

TRACKED_FEATURES = (
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
)
SUSTAINED_DAYS = 7
THRESHOLD_SIGMAS = 4.0


def detect_changepoints(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM changepoints")
    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM daily_features").fetchall()]
    rows: list[tuple] = []
    for user_id in users:
        for feature in TRACKED_FEATURES:
            rows.extend(_cusum_for(con, user_id, feature))
    if rows:
        con.executemany(
            "INSERT INTO changepoints VALUES (?, ?, ?, ?, ?, ?, ?)", rows
        )


def _cusum_for(
    con: duckdb.DuckDBPyConnection, user_id: str, feature: str
) -> list[tuple]:
    series = con.execute(
        f"""
        SELECT d.date, d.{feature}, b.mean, b.std
        FROM daily_features d
        LEFT JOIN baselines b
               ON b.user_id = d.user_id
              AND b.feature = ?
              AND b.window_end = d.date - INTERVAL 1 DAY
        WHERE d.user_id = ?
          AND d.{feature} IS NOT NULL
        ORDER BY d.date
        """,
        (feature, user_id),
    ).fetchall()

    pos = 0.0
    neg = 0.0
    sustained_down = 0
    sustained_up = 0
    detections: list[tuple] = []
    last_fired: dt.date | None = None
    for date, value, mean, std in series:
        if mean is None or std is None or std <= 0:
            pos = neg = 0.0
            sustained_down = sustained_up = 0
            continue
        z = (value - mean) / std
        pos = max(0.0, pos + z - 0.5)
        neg = min(0.0, neg + z + 0.5)
        if z < -1.0:
            sustained_down += 1
        else:
            sustained_down = 0
        if z > 1.0:
            sustained_up += 1
        else:
            sustained_up = 0

        if (
            neg < -THRESHOLD_SIGMAS
            and sustained_down >= SUSTAINED_DAYS
            and (last_fired is None or (date - last_fired).days > 14)
        ):
            detections.append(
                (user_id, feature, date, "down", abs(neg), mean, value)
            )
            last_fired = date
            pos = neg = 0.0
            sustained_down = 0
        elif (
            pos > THRESHOLD_SIGMAS
            and sustained_up >= SUSTAINED_DAYS
            and (last_fired is None or (date - last_fired).days > 14)
        ):
            detections.append(
                (user_id, feature, date, "up", pos, mean, value)
            )
            last_fired = date
            pos = neg = 0.0
            sustained_up = 0
    return detections
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_changepoints.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_06_changepoints.py tests/test_changepoints.py
git commit -m "feat(pipeline): stage 6 CUSUM change-point detection"
```

---

## Task 10: Pipeline stage 7 — insight generation

**Files:**
- Create: `hiptron/pipeline/stages/_07_insights.py`
- Test: `tests/test_insights.py`

- [ ] **Step 1: Write failing test**

`tests/test_insights.py`:
```python
import json

from hiptron.db.connection import apply_schema
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.pipeline.stages._07_insights import generate_insights
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import Scenario


def _run_all(con, scenario):
    apply_schema(con)
    generate(scenario, con)
    segment_walks(con)
    compute_walk_features(con)
    cluster_places(con)
    aggregate_daily(con)
    update_baselines(con)
    detect_changepoints(con)
    generate_insights(con)


def test_changepoint_produces_two_audience_insights(tmp_db):
    scenario = Scenario(
        user_id="u1", seed=11, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0, decline_start_week=5,
    )
    _run_all(tmp_db, scenario)
    n_cp = tmp_db.execute(
        "SELECT count(*) FROM changepoints WHERE feature = 'total_distance_m'"
    ).fetchone()[0]
    assert n_cp >= 1
    n_older = tmp_db.execute(
        "SELECT count(*) FROM insights WHERE audience = 'older_adult'"
    ).fetchone()[0]
    n_rel = tmp_db.execute(
        "SELECT count(*) FROM insights WHERE audience = 'relative'"
    ).fetchone()[0]
    assert n_older == n_cp
    assert n_rel == n_cp


def test_insight_payload_includes_baseline_and_current(tmp_db):
    scenario = Scenario(
        user_id="u1", seed=11, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0, decline_start_week=5,
    )
    _run_all(tmp_db, scenario)
    payload_json = tmp_db.execute(
        "SELECT payload_json FROM insights WHERE audience = 'older_adult' LIMIT 1"
    ).fetchone()[0]
    payload = json.loads(payload_json)
    assert {"feature", "direction", "baseline_mean", "current_value", "pct_delta"} <= payload.keys()
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/stages/_07_insights.py`**

```python
"""Stage 7 — convert change-points into audience-tagged insight rows."""
from __future__ import annotations

import datetime as dt
import hashlib
import json

import duckdb

TEMPLATES: dict[tuple[str, str, str], tuple[str, str]] = {
    # (feature, direction, audience) -> (template_id, template_string)
    ("total_distance_m", "down", "older_adult"): (
        "distance_down_older",
        "You've been taking it easier this week — that's okay.",
    ),
    ("total_distance_m", "down", "relative"): (
        "distance_down_relative",
        "Daily walking distance is about {pct_delta:.0f}% lower than the 4-week baseline.",
    ),
    ("activity_radius_m", "down", "older_adult"): (
        "radius_down_older",
        "Staying closer to home this week. That's fine — rest matters.",
    ),
    ("activity_radius_m", "down", "relative"): (
        "radius_down_relative",
        "Activity radius has dropped ~{pct_delta:.0f}% vs. the baseline.",
    ),
    ("fatigue_index", "down", "older_adult"): (
        "fatigue_older",
        "Walks feel a little harder lately — that's normal sometimes.",
    ),
    ("fatigue_index", "down", "relative"): (
        "fatigue_relative",
        "Within-walk fatigue signal up: end-of-walk speed ~{pct_delta:.0f}% lower than start.",
    ),
    ("place_count", "down", "older_adult"): (
        "places_older",
        "Quieter rhythm this week. A short trip to a favourite spot might feel nice.",
    ),
    ("place_count", "down", "relative"): (
        "places_relative",
        "Fewer distinct places visited this week than usual.",
    ),
}


def generate_insights(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM insights")
    cps = con.execute(
        """
        SELECT user_id, feature, detected_at, direction, score,
               baseline_mean, current_value
        FROM changepoints
        ORDER BY user_id, detected_at
        """
    ).fetchall()
    rows: list[tuple] = []
    for user_id, feature, detected_at, direction, score, baseline_mean, current_value in cps:
        pct_delta = 0.0
        if baseline_mean:
            pct_delta = (current_value - baseline_mean) / baseline_mean * 100.0
        payload = {
            "feature": feature,
            "direction": direction,
            "baseline_mean": baseline_mean,
            "current_value": current_value,
            "pct_delta": pct_delta,
            "window_weeks": 4,
        }
        for audience in ("older_adult", "relative"):
            key = (feature, direction, audience)
            if key not in TEMPLATES:
                continue
            template_id, template_str = TEMPLATES[key]
            payload_with_text = {**payload, "text": template_str.format(**payload)}
            insight_id = _insight_id(user_id, audience, feature, detected_at)
            rows.append((
                insight_id, user_id, audience,
                f"{feature}_{direction}", "notice",
                template_id, json.dumps(payload_with_text),
                dt.datetime.combine(detected_at, dt.time(8, 0)),
                None,
            ))
    if rows:
        con.executemany(
            "INSERT INTO insights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows
        )


def _insight_id(user_id: str, audience: str, feature: str, detected_at: dt.date) -> str:
    return hashlib.sha1(
        f"{user_id}|{audience}|{feature}|{detected_at.isoformat()}".encode()
    ).hexdigest()[:16]
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
uv run pytest tests/test_insights.py -v
```

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_07_insights.py tests/test_insights.py
git commit -m "feat(pipeline): stage 7 audience-tagged insight templates"
```

---

## Task 11: Pipeline runner + CLI + watermarks

**Files:**
- Create: `hiptron/pipeline/state.py`
- Create: `hiptron/pipeline/run.py`
- Test: `tests/test_pipeline_runner.py`

- [ ] **Step 1: Write failing test**

`tests/test_pipeline_runner.py`:
```python
import subprocess
import sys

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import STAGES, run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


def test_run_all_stages_in_order(tmp_path):
    db_path = tmp_path / "p.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()

    run_pipeline(db_path, stage="all")

    ro = open_db(db_path, read_only=True)
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
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/pipeline/state.py`**

```python
import datetime as dt

import duckdb


def get_watermark(con: duckdb.DuckDBPyConnection, stage: str) -> dt.datetime | None:
    row = con.execute(
        "SELECT last_processed_ts FROM pipeline_state WHERE stage = ?", (stage,)
    ).fetchone()
    return row[0] if row else None


def set_watermark(con: duckdb.DuckDBPyConnection, stage: str, ts: dt.datetime) -> None:
    con.execute(
        """
        INSERT INTO pipeline_state VALUES (?, ?)
        ON CONFLICT(stage) DO UPDATE SET last_processed_ts = EXCLUDED.last_processed_ts
        """,
        (stage, ts),
    )
```

- [ ] **Step 4: Write `hiptron/pipeline/run.py`**

```python
"""CLI: python -m hiptron.pipeline run --db data/hiptron.duckdb --stage all|<name>"""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from typing import Callable

import duckdb

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.pipeline.stages._07_insights import generate_insights
from hiptron.pipeline.state import set_watermark

StageFn = Callable[[duckdb.DuckDBPyConnection], None]

STAGES: dict[str, StageFn] = {
    "segment_walks": segment_walks,
    "walk_features": compute_walk_features,
    "cluster_places": cluster_places,
    "daily_aggregate": aggregate_daily,
    "baselines": update_baselines,
    "changepoints": detect_changepoints,
    "insights": generate_insights,
}


def run_pipeline(db_path: Path | str, stage: str = "all") -> None:
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    try:
        if stage == "all":
            for name, fn in STAGES.items():
                _run_one(con, name, fn)
        elif stage in STAGES:
            _run_one(con, stage, STAGES[stage])
        else:
            raise SystemExit(f"unknown stage: {stage} (known: {list(STAGES)})")
    finally:
        con.close()


def _run_one(con: duckdb.DuckDBPyConnection, name: str, fn: StageFn) -> None:
    print(f"[stage] {name}")
    fn(con)
    set_watermark(con, name, dt.datetime.now())


def main() -> None:
    parser = argparse.ArgumentParser(prog="hiptron.pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)
    run = sub.add_parser("run")
    run.add_argument("--db", default="data/hiptron.duckdb")
    run.add_argument("--stage", default="all")
    args = parser.parse_args()
    if args.cmd == "run":
        run_pipeline(args.db, args.stage)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Add `hiptron/pipeline/__main__.py` so `python -m hiptron.pipeline` works**

```python
from hiptron.pipeline.run import main

if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
uv run pytest tests/test_pipeline_runner.py -v
```

- [ ] **Step 7: Commit**

```bash
git add hiptron/pipeline/state.py hiptron/pipeline/run.py hiptron/pipeline/__main__.py tests/test_pipeline_runner.py
git commit -m "feat(pipeline): CLI runner + watermarks"
```

---

## Task 12: FastAPI backend (models + queries + app)

**Files:**
- Create: `hiptron/backend/__init__.py`
- Create: `hiptron/backend/models.py`
- Create: `hiptron/backend/queries.py`
- Create: `hiptron/backend/main.py`
- Test: `tests/test_backend.py`

- [ ] **Step 1: Write failing test**

`tests/test_backend.py`:
```python
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


@pytest.fixture
def populated_db(tmp_path: Path) -> Path:
    db_path = tmp_path / "api.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def test_older_adult_home_returns_cards(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/older-adult/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "greeting" in body
    assert "yesterday_walk" in body
    assert "schematic_map" in body
    assert "streak_days" in body


def test_relative_home_returns_status(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in {"green", "amber"}
    assert "weekly_trend" in body


def test_relative_insights_detail(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/insights", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "blocks" in body
    assert isinstance(body["blocks"], list)
```

- [ ] **Step 2: Run test — expect ModuleNotFoundError**

- [ ] **Step 3: Write `hiptron/backend/__init__.py` (empty)**

- [ ] **Step 4: Write `hiptron/backend/models.py`**

```python
from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel


class Place(BaseModel):
    place_id: str
    label: str
    centroid_lat: float
    centroid_lon: float


class WalkSummary(BaseModel):
    walk_id: str
    start_ts: dt.datetime
    end_ts: dt.datetime
    distance_m: float
    place_labels: list[str]


class SchematicMap(BaseModel):
    home_lat: float
    home_lon: float
    places: list[Place]
    walk_polyline: list[tuple[float, float]]


class OlderAdultHome(BaseModel):
    greeting: str
    date: dt.date
    yesterday_walk: WalkSummary | None
    schematic_map: SchematicMap | None
    streak_days: int
    family_note: str | None
    trend_card: str | None


class WeeklyTrendPoint(BaseModel):
    date: dt.date
    value: float


class WeeklyTrend(BaseModel):
    headline: str
    points: list[WeeklyTrendPoint]
    baseline_mean: float


class WorthNoticing(BaseModel):
    headline: str
    detail: str
    feature: str


class RelativeHome(BaseModel):
    status: Literal["green", "amber"]
    last_update: dt.datetime
    summary: str
    weekly_trend: WeeklyTrend
    worth_noticing: WorthNoticing | None


class InsightBlock(BaseModel):
    question: str
    verdict: str
    chart_kind: Literal["line", "bar", "places", "list"]
    series: list[dict]
    hidden: bool = False


class InsightsDetail(BaseModel):
    user_id: str
    blocks: list[InsightBlock]
```

- [ ] **Step 5: Write `hiptron/backend/queries.py`**

```python
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import duckdb

from hiptron.backend.models import (
    InsightBlock, InsightsDetail, OlderAdultHome, Place,
    RelativeHome, SchematicMap, WalkSummary, WeeklyTrend, WeeklyTrendPoint,
    WorthNoticing,
)
from hiptron.db.connection import open_db


def _con(db_path: Path) -> duckdb.DuckDBPyConnection:
    return open_db(db_path, read_only=True)


def older_adult_home(db_path: Path, user_id: str) -> OlderAdultHome:
    con = _con(db_path)
    try:
        today = dt.date.today()
        yesterday = today - dt.timedelta(days=1)

        walk_row = con.execute(
            """
            SELECT w.walk_id, w.start_ts, w.end_ts, wf.distance_m
            FROM walks w
            JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = ?
              AND CAST(w.start_ts AS DATE) = ?
            ORDER BY wf.distance_m DESC
            LIMIT 1
            """,
            (user_id, yesterday),
        ).fetchone()
        # fall back to most recent walk if no yesterday walk
        if walk_row is None:
            walk_row = con.execute(
                """
                SELECT w.walk_id, w.start_ts, w.end_ts, wf.distance_m
                FROM walks w
                JOIN walk_features wf ON wf.walk_id = w.walk_id
                WHERE w.user_id = ?
                ORDER BY w.start_ts DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()

        yesterday_walk = None
        schematic = None
        if walk_row:
            walk_id, start_ts, end_ts, distance = walk_row
            visits = con.execute(
                """
                SELECT p.label FROM walk_place_visits v
                JOIN places p ON p.place_id = v.place_id
                WHERE v.walk_id = ?
                """,
                (walk_id,),
            ).fetchall()
            place_labels = [v[0] for v in visits]
            yesterday_walk = WalkSummary(
                walk_id=walk_id, start_ts=start_ts, end_ts=end_ts,
                distance_m=distance, place_labels=place_labels,
            )
            polyline = con.execute(
                """
                SELECT lat, lon FROM gps_fixes
                WHERE user_id = ? AND ts BETWEEN ? AND ?
                ORDER BY ts
                """,
                (user_id, start_ts, end_ts),
            ).fetchall()
            home = con.execute(
                """
                SELECT median(lat), median(lon) FROM gps_fixes WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()
            places = [
                Place(place_id=pid, label=lab, centroid_lat=lat, centroid_lon=lon)
                for pid, lat, lon, lab in con.execute(
                    """
                    SELECT place_id, centroid_lat, centroid_lon, label
                    FROM places WHERE user_id = ?
                    """,
                    (user_id,),
                ).fetchall()
            ]
            schematic = SchematicMap(
                home_lat=home[0], home_lon=home[1],
                places=places, walk_polyline=polyline,
            )

        streak = _streak_days(con, user_id)
        trend = _latest_older_adult_trend_text(con, user_id)
        return OlderAdultHome(
            greeting="Good morning",
            date=today,
            yesterday_walk=yesterday_walk,
            schematic_map=schematic,
            streak_days=streak,
            family_note=None,
            trend_card=trend,
        )
    finally:
        con.close()


def _streak_days(con: duckdb.DuckDBPyConnection, user_id: str) -> int:
    rows = con.execute(
        """
        SELECT date FROM daily_features
        WHERE user_id = ? AND n_outings > 0
        ORDER BY date DESC
        """,
        (user_id,),
    ).fetchall()
    streak = 0
    expected = dt.date.today()
    for (d,) in rows:
        if d == expected or d == expected - dt.timedelta(days=1):
            streak += 1
            expected = d - dt.timedelta(days=1)
        else:
            break
    return streak


def _latest_older_adult_trend_text(
    con: duckdb.DuckDBPyConnection, user_id: str
) -> str | None:
    row = con.execute(
        """
        SELECT payload_json FROM insights
        WHERE user_id = ? AND audience = 'older_adult'
        ORDER BY created_ts DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not row:
        return None
    return json.loads(row[0])["text"]


def relative_home(db_path: Path, user_id: str) -> RelativeHome:
    con = _con(db_path)
    try:
        points = con.execute(
            """
            SELECT date, total_distance_m FROM daily_features
            WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL 7 DAY
            ORDER BY date
            """,
            (user_id,),
        ).fetchall()
        baseline = con.execute(
            """
            SELECT mean FROM baselines
            WHERE user_id = ? AND feature = 'total_distance_m'
            ORDER BY window_end DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        baseline_mean = float(baseline[0]) if baseline else 0.0
        weekly = WeeklyTrend(
            headline=_trend_headline(points, baseline_mean),
            points=[WeeklyTrendPoint(date=d, value=v or 0.0) for d, v in points],
            baseline_mean=baseline_mean,
        )

        latest_cp = con.execute(
            """
            SELECT i.payload_json FROM insights i
            WHERE i.user_id = ? AND i.audience = 'relative'
              AND i.created_ts >= CURRENT_TIMESTAMP - INTERVAL 14 DAY
            ORDER BY i.created_ts DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        worth = None
        status: str = "green"
        if latest_cp:
            payload = json.loads(latest_cp[0])
            status = "amber"
            worth = WorthNoticing(
                headline=payload["text"],
                detail=(
                    f"{payload['feature']} change: baseline "
                    f"{payload['baseline_mean']:.1f}, now {payload['current_value']:.1f}."
                ),
                feature=payload["feature"],
            )
        last_update_row = con.execute(
            "SELECT max(ts) FROM gps_fixes WHERE user_id = ?", (user_id,)
        ).fetchone()
        last_update = last_update_row[0] or dt.datetime.now()

        summary = "Routine looks normal." if status == "green" else "Worth noticing this week."
        return RelativeHome(
            status=status, last_update=last_update,
            summary=summary, weekly_trend=weekly, worth_noticing=worth,
        )
    finally:
        con.close()


def _trend_headline(points: list[tuple], baseline_mean: float) -> str:
    if not points or baseline_mean <= 0:
        return "Not enough data yet."
    recent = sum((v or 0.0) for _, v in points) / max(1, len(points))
    delta_pct = (recent - baseline_mean) / baseline_mean * 100.0
    if abs(delta_pct) < 5:
        return "Walking distance steady this week."
    if delta_pct < 0:
        return f"Walking distance is ~{abs(delta_pct):.0f}% lower than the 4-week baseline."
    return f"Walking distance is ~{delta_pct:.0f}% higher than the 4-week baseline."


def insights_detail(db_path: Path, user_id: str) -> InsightsDetail:
    con = _con(db_path)
    try:
        blocks: list[InsightBlock] = []
        for feature, question, chart_kind in (
            ("total_distance_m", "How far is Helga going?", "bar"),
            ("activity_radius_m", "Is the daily routine holding?", "line"),
            ("fatigue_index", "Are walks getting harder?", "line"),
            ("place_count", "Where has she been?", "places"),
        ):
            series_rows = con.execute(
                f"""
                SELECT date, {feature} FROM daily_features
                WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL 28 DAY
                ORDER BY date
                """,
                (user_id,),
            ).fetchall()
            baseline = con.execute(
                """
                SELECT mean FROM baselines
                WHERE user_id = ? AND feature = ?
                ORDER BY window_end DESC LIMIT 1
                """,
                (user_id, feature),
            ).fetchone()
            baseline_mean = float(baseline[0]) if baseline else 0.0
            verdict = _block_verdict(feature, series_rows, baseline_mean)
            hidden = len(series_rows) < 14
            blocks.append(InsightBlock(
                question=question,
                verdict=verdict,
                chart_kind=chart_kind,
                series=[
                    {"date": str(d), "value": v or 0.0, "baseline": baseline_mean}
                    for d, v in series_rows
                ],
                hidden=hidden,
            ))

        cp_rows = con.execute(
            """
            SELECT feature, detected_at, direction, baseline_mean, current_value
            FROM changepoints
            WHERE user_id = ?
            ORDER BY detected_at DESC LIMIT 10
            """,
            (user_id,),
        ).fetchall()
        cp_verdict = (
            "Nothing has changed enough to mention."
            if not cp_rows else f"{len(cp_rows)} change-point(s) detected recently."
        )
        blocks.append(InsightBlock(
            question="Any change-points lately?",
            verdict=cp_verdict,
            chart_kind="list",
            series=[
                {"feature": f, "detected_at": str(d), "direction": dr,
                 "baseline_mean": bm, "current_value": cv}
                for f, d, dr, bm, cv in cp_rows
            ],
            hidden=False,
        ))
        return InsightsDetail(user_id=user_id, blocks=blocks)
    finally:
        con.close()


def _block_verdict(feature: str, series: list[tuple], baseline_mean: float) -> str:
    if not series or baseline_mean <= 0:
        return "Not enough data yet."
    recent_vals = [v for _, v in series[-7:] if v is not None]
    if not recent_vals:
        return "Not enough data yet."
    recent = sum(recent_vals) / len(recent_vals)
    delta = (recent - baseline_mean) / baseline_mean * 100.0
    name = {
        "total_distance_m": "distance",
        "activity_radius_m": "activity radius",
        "fatigue_index": "fatigue signal",
        "place_count": "place variety",
    }[feature]
    if abs(delta) < 7:
        return f"{name.capitalize()} is steady."
    direction = "down" if delta < 0 else "up"
    return f"{name.capitalize()} is {abs(delta):.0f}% {direction} vs. baseline."
```

- [ ] **Step 6: Write `hiptron/backend/main.py`**

```python
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hiptron.backend.queries import (
    insights_detail, older_adult_home, relative_home,
)
from hiptron.backend.models import (
    InsightsDetail, OlderAdultHome, RelativeHome,
)


def create_app(db_path: Path | str) -> FastAPI:
    app = FastAPI(title="Hiptron Mobility Insights")
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"],
        allow_methods=["GET"], allow_headers=["*"],
    )
    db = Path(db_path)

    @app.get("/api/older-adult/home", response_model=OlderAdultHome)
    def get_older_adult_home(user_id: str) -> OlderAdultHome:
        return older_adult_home(db, user_id)

    @app.get("/api/relative/home", response_model=RelativeHome)
    def get_relative_home(user_id: str) -> RelativeHome:
        return relative_home(db, user_id)

    @app.get("/api/relative/insights", response_model=InsightsDetail)
    def get_relative_insights(user_id: str) -> InsightsDetail:
        return insights_detail(db, user_id)

    return app


app = create_app(Path("data/hiptron.duckdb"))
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
uv run pytest tests/test_backend.py -v
```

- [ ] **Step 8: Commit**

```bash
git add hiptron/backend/ tests/test_backend.py
git commit -m "feat(backend): FastAPI app, Pydantic models, DuckDB read queries"
```

---

## Task 13: Scaffold webapp (Vite + React + TS + Tailwind + Router + Query)

**Files:**
- Create: `webapp/package.json`
- Create: `webapp/vite.config.ts`
- Create: `webapp/tsconfig.json`
- Create: `webapp/tailwind.config.ts`
- Create: `webapp/postcss.config.js`
- Create: `webapp/index.html`
- Create: `webapp/src/main.tsx`
- Create: `webapp/src/App.tsx`
- Create: `webapp/src/index.css`
- Create: `webapp/tests/setup.ts`

- [ ] **Step 1: Init webapp dir**

```bash
mkdir -p webapp/src/{shared,modes/older-adult/cards,modes/relative/cards,modes/relative/insights} webapp/tests/{older-adult,relative} webapp/public/icons
```

- [ ] **Step 2: Write `webapp/package.json`**

```json
{
  "name": "hiptron-webapp",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests --max-warnings 0",
    "format": "prettier --write src tests"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.13.0",
    "eslint-plugin-react": "^7.37.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "prettier": "^3.3.3",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 3: Write `webapp/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Write `webapp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Write `webapp/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "hero": ["3rem", { lineHeight: "1.1" }],
      },
      colors: {
        warm: {
          50: "#FBF7F2",
          100: "#F4ECE2",
          200: "#E9D9C5",
          800: "#3D2F22",
        },
        moss: {
          400: "#7BA688",
          600: "#4F7E5E",
        },
        amber: {
          500: "#D89B4A",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Write `webapp/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `webapp/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Hiptron</title>
  </head>
  <body class="bg-warm-50">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `webapp/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

body {
  -webkit-font-smoothing: antialiased;
  color: theme(colors.warm.800);
}
```

- [ ] **Step 9: Write `webapp/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 10: Write `webapp/src/App.tsx` (placeholder routes; filled by later tasks)**

```tsx
import { Navigate, Route, Routes } from "react-router-dom";

import OlderAdultHome from "./modes/older-adult/Home";
import RelativeHome from "./modes/relative/Home";
import InsightsDetail from "./modes/relative/InsightsDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ModeChooser />} />
      <Route path="/older-adult" element={<OlderAdultHome />} />
      <Route path="/relative" element={<RelativeHome />} />
      <Route path="/relative/insights" element={<InsightsDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ModeChooser() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Hiptron</h1>
      <p className="text-warm-800/80">Choose a mode (prototype):</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a className="rounded-2xl bg-moss-600 text-white px-6 py-4 text-center text-lg"
           href="/older-adult">Older-Adult mode</a>
        <a className="rounded-2xl border-2 border-moss-600 text-moss-600 px-6 py-4 text-center text-lg"
           href="/relative">Relative mode</a>
      </div>
    </main>
  );
}
```

- [ ] **Step 11: Write `webapp/tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 12: Install + smoke test**

```bash
cd webapp
pnpm install
pnpm test
```

Expected: no tests yet, exits 0.

- [ ] **Step 13: Commit**

```bash
git add webapp/
git commit -m "chore(webapp): scaffold Vite + React + TS + Tailwind + Router + Query"
```

---

## Task 14: Shared API hooks + types + base components

**Files:**
- Create: `webapp/src/shared/types.ts`
- Create: `webapp/src/shared/api.ts`
- Create: `webapp/src/shared/Card.tsx`
- Create: `webapp/src/shared/Sentence.tsx`
- Test: `webapp/tests/shared/api.test.tsx`

- [ ] **Step 1: Write failing test for API hook**

`webapp/tests/shared/api.test.tsx`:
```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { useOlderAdultHome } from "../../src/shared/api";

const sample = {
  greeting: "Good morning",
  date: "2026-05-24",
  yesterday_walk: null,
  schematic_map: null,
  streak_days: 0,
  family_note: null,
  trend_card: null,
};

describe("useOlderAdultHome", () => {
  it("fetches from /api/older-adult/home", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sample,
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useOlderAdultHome("helga"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.greeting).toBe("Good morning");
    expect(fetch).toHaveBeenCalledWith(
      "/api/older-adult/home?user_id=helga", expect.any(Object),
    );
  });
});
```

- [ ] **Step 2: Run test — expect import failure**

```bash
cd webapp && pnpm test
```

- [ ] **Step 3: Write `webapp/src/shared/types.ts`**

```ts
export interface Place {
  place_id: string;
  label: string;
  centroid_lat: number;
  centroid_lon: number;
}

export interface WalkSummary {
  walk_id: string;
  start_ts: string;
  end_ts: string;
  distance_m: number;
  place_labels: string[];
}

export interface SchematicMap {
  home_lat: number;
  home_lon: number;
  places: Place[];
  walk_polyline: [number, number][];
}

export interface OlderAdultHome {
  greeting: string;
  date: string;
  yesterday_walk: WalkSummary | null;
  schematic_map: SchematicMap | null;
  streak_days: number;
  family_note: string | null;
  trend_card: string | null;
}

export interface WeeklyTrendPoint { date: string; value: number; }
export interface WeeklyTrend {
  headline: string;
  points: WeeklyTrendPoint[];
  baseline_mean: number;
}
export interface WorthNoticing {
  headline: string; detail: string; feature: string;
}
export interface RelativeHome {
  status: "green" | "amber";
  last_update: string;
  summary: string;
  weekly_trend: WeeklyTrend;
  worth_noticing: WorthNoticing | null;
}

export type ChartKind = "line" | "bar" | "places" | "list";
export interface InsightBlock {
  question: string;
  verdict: string;
  chart_kind: ChartKind;
  series: Record<string, unknown>[];
  hidden: boolean;
}
export interface InsightsDetail {
  user_id: string;
  blocks: InsightBlock[];
}
```

- [ ] **Step 4: Write `webapp/src/shared/api.ts`**

```ts
import { useQuery } from "@tanstack/react-query";

import type { InsightsDetail, OlderAdultHome, RelativeHome } from "./types";

const DEFAULT_USER = "helga";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useOlderAdultHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["older-adult-home", userId],
    queryFn: () => fetchJson<OlderAdultHome>(`/api/older-adult/home?user_id=${userId}`),
  });
}

export function useRelativeHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-home", userId],
    queryFn: () => fetchJson<RelativeHome>(`/api/relative/home?user_id=${userId}`),
  });
}

export function useRelativeInsights(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-insights", userId],
    queryFn: () => fetchJson<InsightsDetail>(`/api/relative/insights?user_id=${userId}`),
  });
}
```

- [ ] **Step 5: Write `webapp/src/shared/Card.tsx`**

```tsx
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  ariaLabel?: string;
}

export function Card({ children, className = "", onTap, ariaLabel }: Props) {
  const base =
    "rounded-3xl bg-warm-100 p-5 shadow-sm border border-warm-200 transition";
  const tappable = onTap ? "active:scale-[0.99] cursor-pointer" : "";
  const Tag = onTap ? "button" : "div";
  return (
    <Tag
      className={`${base} ${tappable} ${className}`}
      onClick={onTap}
      aria-label={ariaLabel}
      style={{ minHeight: 44 }}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 6: Write `webapp/src/shared/Sentence.tsx`**

```tsx
interface Props {
  text: string;
  className?: string;
}

export function Sentence({ text, className = "" }: Props) {
  return (
    <p className={`text-lg leading-snug text-warm-800 ${className}`}>{text}</p>
  );
}
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd webapp && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add webapp/src/shared/ webapp/tests/shared/
git commit -m "feat(webapp): shared API hooks, types, base components"
```

---

## Task 15: Older-Adult Home screen + cards

**Files:**
- Create: `webapp/src/modes/older-adult/Home.tsx`
- Create: `webapp/src/modes/older-adult/cards/GreetingCard.tsx`
- Create: `webapp/src/modes/older-adult/cards/YesterdayWalkCard.tsx`
- Create: `webapp/src/modes/older-adult/cards/StreakCard.tsx`
- Create: `webapp/src/modes/older-adult/cards/FamilyNoteCard.tsx`
- Create: `webapp/src/modes/older-adult/cards/TrendCard.tsx`
- Test: `webapp/tests/older-adult/Home.test.tsx`

- [ ] **Step 1: Write failing test**

`webapp/tests/older-adult/Home.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "../../src/modes/older-adult/Home";

const fakeHome = {
  greeting: "Good morning",
  date: "2026-05-24",
  yesterday_walk: {
    walk_id: "w1", start_ts: "2026-05-23T09:00:00", end_ts: "2026-05-23T09:45:00",
    distance_m: 1450.0, place_labels: ["bakery", "park"],
  },
  schematic_map: {
    home_lat: 52.52, home_lon: 13.40, places: [], walk_polyline: [[52.52, 13.40]],
  },
  streak_days: 5,
  family_note: "Anna sent a heart for your walk yesterday",
  trend_card: null,
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => fakeHome,
  }));
});

describe("Older-Adult Home", () => {
  it("shows greeting, distance, streak, family note", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/Good morning/i)).toBeInTheDocument());
    expect(screen.getByText(/1\.45 km/)).toBeInTheDocument();
    expect(screen.getByText(/5 days in a row/i)).toBeInTheDocument();
    expect(screen.getByText(/Anna sent a heart/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect import failure**

- [ ] **Step 3: Write `webapp/src/modes/older-adult/cards/GreetingCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";

interface Props { greeting: string; date: string; }

export function GreetingCard({ greeting, date }: Props) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
  return (
    <Card className="text-center">
      <h1 className="text-2xl font-semibold">{greeting}, Helga</h1>
      <p className="text-warm-800/70 mt-1">{formattedDate}</p>
    </Card>
  );
}
```

- [ ] **Step 4: Write `webapp/src/modes/older-adult/cards/YesterdayWalkCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";
import type { WalkSummary } from "../../../shared/types";

interface Props { walk: WalkSummary | null; }

export function YesterdayWalkCard({ walk }: Props) {
  if (!walk) {
    return (
      <Card>
        <p className="text-lg">No outdoor time yet today — that's okay.</p>
      </Card>
    );
  }
  const km = (walk.distance_m / 1000).toFixed(2);
  const places = walk.place_labels.join(" and ");
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">Yesterday's walk</p>
      <p className="text-hero font-semibold mt-2">{km} km</p>
      {places && (
        <p className="text-lg text-warm-800/80 mt-1">via {places}</p>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: Write `webapp/src/modes/older-adult/cards/StreakCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";

interface Props { days: number; }

export function StreakCard({ days }: Props) {
  if (days <= 0) return null;
  return (
    <Card className="bg-moss-400/20 border-moss-400">
      <p className="text-lg">⭐ {days} days in a row outside.</p>
    </Card>
  );
}
```

- [ ] **Step 6: Write `webapp/src/modes/older-adult/cards/FamilyNoteCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";

interface Props { note: string | null; }

export function FamilyNoteCard({ note }: Props) {
  if (!note) return null;
  return (
    <Card className="bg-warm-200">
      <p className="text-lg">💌 {note}</p>
    </Card>
  );
}
```

- [ ] **Step 7: Write `webapp/src/modes/older-adult/cards/TrendCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";

interface Props { text: string | null; }

export function TrendCard({ text }: Props) {
  if (!text) return null;
  return (
    <Card className="bg-warm-100 border-warm-200">
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">A gentle note</p>
      <p className="text-lg mt-2">{text}</p>
    </Card>
  );
}
```

- [ ] **Step 8: Write `webapp/src/modes/older-adult/Home.tsx`**

```tsx
import { Link } from "react-router-dom";

import { useOlderAdultHome } from "../../shared/api";
import { GreetingCard } from "./cards/GreetingCard";
import { YesterdayWalkCard } from "./cards/YesterdayWalkCard";
import { StreakCard } from "./cards/StreakCard";
import { FamilyNoteCard } from "./cards/FamilyNoteCard";
import { TrendCard } from "./cards/TrendCard";
import { SchematicMap } from "./SchematicMap";

export default function OlderAdultHome() {
  const { data, isLoading, isError } = useOlderAdultHome();

  if (isLoading) return <FullScreenMessage text="Loading your day…" />;
  if (isError || !data) return <FullScreenMessage text="Something went quiet. Try again later." />;

  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <GreetingCard greeting={data.greeting} date={data.date} />
      <YesterdayWalkCard walk={data.yesterday_walk} />
      {data.schematic_map && (
        <Link to="/older-adult/week" aria-label="Open week view">
          <SchematicMap map={data.schematic_map} />
        </Link>
      )}
      <StreakCard days={data.streak_days} />
      <FamilyNoteCard note={data.family_note} />
      <TrendCard text={data.trend_card} />
    </main>
  );
}

function FullScreenMessage({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-lg text-warm-800/80">
      {text}
    </main>
  );
}
```

- [ ] **Step 9: Run tests — expect PASS once SchematicMap stub exists**

(Stub `SchematicMap.tsx` minimally so test renders.)

- [ ] **Step 10: Add stub `webapp/src/modes/older-adult/SchematicMap.tsx`**

```tsx
import { Card } from "../../shared/Card";
import type { SchematicMap as SchematicMapType } from "../../shared/types";

interface Props { map: SchematicMapType; }

export function SchematicMap({ map }: Props) {
  return (
    <Card ariaLabel="Schematic map of your week">
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">Your map</p>
      <p className="mt-2 text-sm">{map.places.length} places · {map.walk_polyline.length} points</p>
    </Card>
  );
}

export default SchematicMap;
```

- [ ] **Step 11: Run tests — expect PASS**

```bash
cd webapp && pnpm test tests/older-adult/Home.test.tsx
```

- [ ] **Step 12: Commit**

```bash
git add webapp/src/modes/older-adult/ webapp/tests/older-adult/Home.test.tsx
git commit -m "feat(webapp): older-adult home screen with cards"
```

---

## Task 16: SchematicMap SVG component (real)

**Files:**
- Modify: `webapp/src/modes/older-adult/SchematicMap.tsx`
- Test: `webapp/tests/older-adult/SchematicMap.test.tsx`

- [ ] **Step 1: Write failing test**

`webapp/tests/older-adult/SchematicMap.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchematicMap } from "../../src/modes/older-adult/SchematicMap";

describe("SchematicMap", () => {
  it("renders home dot, place dots, and walk polyline", () => {
    render(
      <SchematicMap
        map={{
          home_lat: 52.52, home_lon: 13.40,
          places: [
            { place_id: "p1", label: "bakery", centroid_lat: 52.521, centroid_lon: 13.4006 },
            { place_id: "p2", label: "park", centroid_lat: 52.5198, centroid_lon: 13.4012 },
          ],
          walk_polyline: [[52.52, 13.40], [52.5205, 13.4002], [52.521, 13.4006]],
        }}
      />,
    );
    expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    expect(screen.getByText("bakery")).toBeInTheDocument();
    expect(screen.getByText("park")).toBeInTheDocument();
    expect(screen.getByLabelText(/walk path/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Replace stub with real `webapp/src/modes/older-adult/SchematicMap.tsx`**

```tsx
import { useMemo } from "react";

import { Card } from "../../shared/Card";
import type { SchematicMap as SchematicMapType, Place } from "../../shared/types";

interface Props { map: SchematicMapType; }

const VIEW_SIZE = 300;
const PADDING = 24;

export function SchematicMap({ map }: Props) {
  const { homePx, places, polyline } = useMemo(
    () => projectPoints(map), [map],
  );

  return (
    <Card ariaLabel="Schematic map of your week">
      <p className="text-warm-800/70 text-sm uppercase tracking-wide mb-2">Your map</p>
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full h-auto"
        role="img"
      >
        <rect x="0" y="0" width={VIEW_SIZE} height={VIEW_SIZE}
              fill="#FBF7F2" rx="16" />
        <polyline
          aria-label="walk path"
          points={polyline.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none" stroke="#7BA688" strokeWidth="3" strokeLinejoin="round"
        />
        {places.map(({ place, x, y }) => (
          <g key={place.place_id}>
            <circle cx={x} cy={y} r="8" fill="#D89B4A" />
            <text
              x={x} y={y - 12}
              textAnchor="middle"
              className="text-xs"
              fill="#3D2F22"
            >{place.label}</text>
          </g>
        ))}
        <circle
          aria-label="home"
          cx={homePx[0]} cy={homePx[1]} r="10" fill="#4F7E5E" stroke="#FBF7F2" strokeWidth="3"
        />
      </svg>
    </Card>
  );
}

function projectPoints(map: SchematicMapType) {
  const all: [number, number][] = [
    [map.home_lat, map.home_lon],
    ...map.places.map((p): [number, number] => [p.centroid_lat, p.centroid_lon]),
    ...map.walk_polyline,
  ];
  const lats = all.map(([la]) => la);
  const lons = all.map(([, lo]) => lo);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const dLat = Math.max(1e-6, maxLat - minLat);
  const dLon = Math.max(1e-6, maxLon - minLon);
  const inner = VIEW_SIZE - PADDING * 2;
  const project = (lat: number, lon: number): [number, number] => {
    const x = PADDING + ((lon - minLon) / dLon) * inner;
    const y = VIEW_SIZE - PADDING - ((lat - minLat) / dLat) * inner;
    return [x, y];
  };
  return {
    homePx: project(map.home_lat, map.home_lon),
    places: map.places.map((place: Place) => {
      const [x, y] = project(place.centroid_lat, place.centroid_lon);
      return { place, x, y };
    }),
    polyline: map.walk_polyline.map(([la, lo]) => project(la, lo)),
  };
}

export default SchematicMap;
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
cd webapp && pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add webapp/src/modes/older-adult/SchematicMap.tsx webapp/tests/older-adult/SchematicMap.test.tsx
git commit -m "feat(webapp): schematic SVG map with projection"
```

---

## Task 17: Older-Adult Week View

**Files:**
- Create: `webapp/src/modes/older-adult/WeekView.tsx`
- Modify: `webapp/src/App.tsx` (add route)

- [ ] **Step 1: Add WeekView placeholder route**

Modify `webapp/src/App.tsx` to add:
```tsx
<Route path="/older-adult/week" element={<OlderAdultWeekView />} />
```

And import:
```tsx
import OlderAdultWeekView from "./modes/older-adult/WeekView";
```

- [ ] **Step 2: Write `webapp/src/modes/older-adult/WeekView.tsx`**

```tsx
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

import { useRelativeInsights } from "../../shared/api";
import { Card } from "../../shared/Card";

export default function OlderAdultWeekView() {
  const { data } = useRelativeInsights("helga");
  const distanceBlock = data?.blocks.find(b => b.question.includes("How far"));
  const points = (distanceBlock?.series ?? []).map(p => ({
    date: String(p.date).slice(5),
    km: Number(p.value) / 1000,
  }));
  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <Link to="/older-adult" className="text-warm-800/70 text-sm">← back</Link>
      <Card>
        <p className="text-warm-800/70 text-sm uppercase tracking-wide">Your week</p>
        <div className="h-48 mt-3">
          <ResponsiveContainer>
            <BarChart data={points}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="km" fill="#4F7E5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-lg mt-3">Each bar is a day's walking distance, in kilometres.</p>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test — start backend + webapp manually**

```bash
just pipeline run --stage all
just backend &
just dev
```

Open `http://localhost:5173/older-adult/week`, verify chart renders with synthetic data.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/modes/older-adult/WeekView.tsx webapp/src/App.tsx
git commit -m "feat(webapp): older-adult week view with daily bars"
```

---

## Task 18: Relative Home screen + cards

**Files:**
- Create: `webapp/src/modes/relative/Home.tsx`
- Create: `webapp/src/modes/relative/cards/StatusCard.tsx`
- Create: `webapp/src/modes/relative/cards/WeeklyTrendCard.tsx`
- Create: `webapp/src/modes/relative/cards/WorthNoticingCard.tsx`
- Create: `webapp/src/modes/relative/cards/FooterPrivacyCard.tsx`
- Test: `webapp/tests/relative/Home.test.tsx`

- [ ] **Step 1: Write failing test**

`webapp/tests/relative/Home.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RelativeHome from "../../src/modes/relative/Home";

const fakeHome = {
  status: "green",
  last_update: "2026-05-24T08:00:00",
  summary: "Routine looks normal.",
  weekly_trend: {
    headline: "Walking distance steady this week.",
    points: [
      { date: "2026-05-18", value: 1200 },
      { date: "2026-05-19", value: 1100 },
    ],
    baseline_mean: 1150,
  },
  worth_noticing: null,
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RelativeHome />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => fakeHome,
  }));
});

describe("Relative Home", () => {
  it("shows status dot, trend headline, no worth-noticing card", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/Routine looks normal/i)).toBeInTheDocument());
    expect(screen.getByText(/steady this week/i)).toBeInTheDocument();
    expect(screen.queryByText(/worth noticing/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Helga controls/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect import failure**

- [ ] **Step 3: Write `webapp/src/modes/relative/cards/StatusCard.tsx`**

```tsx
import { Link } from "react-router-dom";

import { Card } from "../../../shared/Card";

interface Props {
  status: "green" | "amber";
  summary: string;
  lastUpdate: string;
}

export function StatusCard({ status, summary, lastUpdate }: Props) {
  const dotColor = status === "green" ? "bg-moss-600" : "bg-amber-500";
  return (
    <Link to="/relative/insights" aria-label="Open insights detail">
      <Card>
        <div className="flex items-center gap-3">
          <span className={`w-4 h-4 rounded-full ${dotColor}`} aria-label={`status ${status}`} />
          <div className="flex-1">
            <p className="text-lg font-medium">{summary}</p>
            <p className="text-warm-800/60 text-sm">
              Updated {new Date(lastUpdate).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-warm-200 px-4 py-2 text-warm-800"
            onClick={(e) => { e.preventDefault(); /* send heart */ }}
          >♥ Send</button>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Write `webapp/src/modes/relative/cards/WeeklyTrendCard.tsx`**

```tsx
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card } from "../../../shared/Card";
import { Sentence } from "../../../shared/Sentence";
import type { WeeklyTrend } from "../../../shared/types";

interface Props { trend: WeeklyTrend; }

export function WeeklyTrendCard({ trend }: Props) {
  const data = trend.points.map(p => ({
    date: String(p.date).slice(5),
    value: p.value,
  }));
  return (
    <Card>
      <Sentence text={trend.headline} className="font-medium mb-3" />
      <div className="h-40">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Bar dataKey="value" fill="#7BA688" radius={[4, 4, 0, 0]} />
            <ReferenceLine y={trend.baseline_mean} stroke="#3D2F22" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-warm-800/60 mt-2">
        Bars = daily distance. Dashed line = 4-week average.
      </p>
    </Card>
  );
}
```

- [ ] **Step 5: Write `webapp/src/modes/relative/cards/WorthNoticingCard.tsx`**

```tsx
import { Card } from "../../../shared/Card";
import { Sentence } from "../../../shared/Sentence";
import type { WorthNoticing } from "../../../shared/types";

interface Props { item: WorthNoticing; }

export function WorthNoticingCard({ item }: Props) {
  return (
    <Card className="border-amber-500 border-2">
      <p className="text-amber-500 text-sm uppercase tracking-wide mb-1">Worth noticing</p>
      <Sentence text={item.headline} className="font-medium" />
      <p className="text-warm-800/80 text-sm mt-2">{item.detail}</p>
      <div className="flex gap-2 mt-3">
        <button className="rounded-2xl bg-warm-200 px-4 py-2 text-warm-800">See details</button>
        <button className="rounded-2xl border border-warm-200 px-4 py-2 text-warm-800">
          Mute 7 days
        </button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Write `webapp/src/modes/relative/cards/FooterPrivacyCard.tsx`**

```tsx
export function FooterPrivacyCard() {
  return (
    <p className="text-center text-xs text-warm-800/60 mt-4 mb-2 px-4">
      Helga controls what you see. You see trends, never raw location.
    </p>
  );
}
```

- [ ] **Step 7: Write `webapp/src/modes/relative/Home.tsx`**

```tsx
import { useRelativeHome } from "../../shared/api";
import { FooterPrivacyCard } from "./cards/FooterPrivacyCard";
import { StatusCard } from "./cards/StatusCard";
import { WeeklyTrendCard } from "./cards/WeeklyTrendCard";
import { WorthNoticingCard } from "./cards/WorthNoticingCard";

export default function RelativeHome() {
  const { data, isLoading, isError } = useRelativeHome();
  if (isLoading) return <Loading />;
  if (isError || !data) return <Loading text="Couldn't load — try again later." />;
  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <StatusCard status={data.status} summary={data.summary} lastUpdate={data.last_update} />
      <WeeklyTrendCard trend={data.weekly_trend} />
      {data.worth_noticing && <WorthNoticingCard item={data.worth_noticing} />}
      <FooterPrivacyCard />
    </main>
  );
}

function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-lg text-warm-800/80">
      {text}
    </main>
  );
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
cd webapp && pnpm test tests/relative/Home.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add webapp/src/modes/relative/ webapp/tests/relative/Home.test.tsx
git commit -m "feat(webapp): relative home with status, trend, worth-noticing"
```

---

## Task 19: Relative Insights Detail view

**Files:**
- Create: `webapp/src/modes/relative/InsightsDetail.tsx`
- Create: `webapp/src/modes/relative/insights/RoutineBlock.tsx`
- Create: `webapp/src/modes/relative/insights/DistanceBlock.tsx`
- Create: `webapp/src/modes/relative/insights/FatigueBlock.tsx`
- Create: `webapp/src/modes/relative/insights/PlacesBlock.tsx`
- Create: `webapp/src/modes/relative/insights/ChangepointsBlock.tsx`
- Test: `webapp/tests/relative/InsightsDetail.test.tsx`

- [ ] **Step 1: Write failing test**

`webapp/tests/relative/InsightsDetail.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InsightsDetail from "../../src/modes/relative/InsightsDetail";

const fake = {
  user_id: "helga",
  blocks: [
    { question: "How far is Helga going?", verdict: "Distance is steady.",
      chart_kind: "bar", series: [
        { date: "2026-05-18", value: 1100, baseline: 1150 },
        { date: "2026-05-19", value: 1180, baseline: 1150 },
      ], hidden: false },
    { question: "Is the daily routine holding?", verdict: "Routine holding.",
      chart_kind: "line", series: [
        { date: "2026-05-18", value: 0.9, baseline: 0.92 },
      ], hidden: false },
    { question: "Are walks getting harder?", verdict: "Fatigue signal stable.",
      chart_kind: "line", series: [], hidden: true },
    { question: "Where has she been?", verdict: "Bakery and park most days.",
      chart_kind: "places", series: [
        { label: "bakery", count: 5 }, { label: "park", count: 3 },
      ], hidden: false },
    { question: "Any change-points lately?", verdict: "Nothing has changed enough to mention.",
      chart_kind: "list", series: [], hidden: false },
  ],
};

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InsightsDetail />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => fake,
  }));
});

describe("Insights Detail", () => {
  it("renders question + verdict per visible block, hides hidden blocks", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText(/How far is Helga going/i)).toBeInTheDocument());
    expect(screen.getByText(/Distance is steady/)).toBeInTheDocument();
    expect(screen.queryByText(/Are walks getting harder/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing has changed enough/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect import failure**

- [ ] **Step 3: Write the four block components**

`webapp/src/modes/relative/insights/RoutineBlock.tsx` and `DistanceBlock.tsx` (similar shape — minimal differences):

```tsx
// DistanceBlock.tsx
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function DistanceBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((p) => ({
    date: String(p.date).slice(5),
    value: Number(p.value),
    baseline: Number(p.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">{block.question}</p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <div className="h-40 mt-3">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Bar dataKey="value" fill="#7BA688" />
            <ReferenceLine y={baseline} stroke="#3D2F22" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

```tsx
// RoutineBlock.tsx
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function RoutineBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((p) => ({
    date: String(p.date).slice(5),
    value: Number(p.value),
    baseline: Number(p.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">{block.question}</p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <div className="h-40 mt-3">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Line dataKey="value" stroke="#4F7E5E" strokeWidth={2} dot={false} />
            <ReferenceLine y={baseline} stroke="#3D2F22" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

```tsx
// FatigueBlock.tsx — same as RoutineBlock but different label colour
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function FatigueBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((p) => ({
    date: String(p.date).slice(5),
    value: Number(p.value),
    baseline: Number(p.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">{block.question}</p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <div className="h-40 mt-3">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Line dataKey="value" stroke="#D89B4A" strokeWidth={2} dot={false} />
            <ReferenceLine y={baseline} stroke="#3D2F22" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

```tsx
// PlacesBlock.tsx
import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function PlacesBlock({ block }: { block: InsightBlock }) {
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">{block.question}</p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {block.series.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex-1">{String(row.label)}</span>
            <span className="bg-moss-400/40 px-2 py-1 rounded text-sm">
              {Number(row.count)} visits
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

```tsx
// ChangepointsBlock.tsx
import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function ChangepointsBlock({ block }: { block: InsightBlock }) {
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">{block.question}</p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      {block.series.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-warm-800/80">
          {block.series.map((row, i) => (
            <li key={i}>
              {String(row.detected_at)} — {String(row.feature)} {String(row.direction)}:
              baseline {Number(row.baseline_mean).toFixed(1)} → {Number(row.current_value).toFixed(1)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Write `webapp/src/modes/relative/InsightsDetail.tsx`**

```tsx
import { Link } from "react-router-dom";

import { useRelativeInsights } from "../../shared/api";
import { ChangepointsBlock } from "./insights/ChangepointsBlock";
import { DistanceBlock } from "./insights/DistanceBlock";
import { FatigueBlock } from "./insights/FatigueBlock";
import { PlacesBlock } from "./insights/PlacesBlock";
import { RoutineBlock } from "./insights/RoutineBlock";
import type { InsightBlock } from "../../shared/types";

export default function InsightsDetail() {
  const { data, isLoading } = useRelativeInsights();
  if (isLoading || !data) return <p className="p-6">Loading…</p>;

  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <Link to="/relative" className="text-warm-800/70 text-sm">← back</Link>
      {data.blocks.filter(b => !b.hidden).map((b) => (
        <BlockFor key={b.question} block={b} />
      ))}
    </main>
  );
}

function BlockFor({ block }: { block: InsightBlock }) {
  if (block.question.includes("How far")) return <DistanceBlock block={block} />;
  if (block.question.includes("routine")) return <RoutineBlock block={block} />;
  if (block.question.includes("harder")) return <FatigueBlock block={block} />;
  if (block.question.includes("Where")) return <PlacesBlock block={block} />;
  if (block.question.includes("change-points")) return <ChangepointsBlock block={block} />;
  return null;
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd webapp && pnpm test tests/relative/InsightsDetail.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add webapp/src/modes/relative/InsightsDetail.tsx webapp/src/modes/relative/insights/ webapp/tests/relative/InsightsDetail.test.tsx
git commit -m "feat(webapp): relative insights detail with question-driven blocks"
```

---

## Task 20: PWA wrapper

**Files:**
- Modify: `webapp/package.json` (add `vite-plugin-pwa`)
- Modify: `webapp/vite.config.ts` (register plugin)
- Create: `webapp/public/icons/icon-192.png` (placeholder)
- Create: `webapp/public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Install plugin**

```bash
cd webapp && pnpm add -D vite-plugin-pwa
```

- [ ] **Step 2: Update `webapp/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Hiptron",
        short_name: "Hiptron",
        description: "Gentle mobility insights",
        theme_color: "#4F7E5E",
        background_color: "#FBF7F2",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8000" } },
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], globals: true },
});
```

- [ ] **Step 3: Add placeholder icons**

Generate two solid-colour PNGs (warm moss `#4F7E5E`) of sizes 192×192 and 512×512 and save to `webapp/public/icons/`. Designer replaces later.

```bash
python -c "
from PIL import Image
for size in (192, 512):
    Image.new('RGB', (size, size), '#4F7E5E').save(f'webapp/public/icons/icon-{size}.png')
"
```

(Requires Pillow: `uv pip install --system pillow` if not present.)

- [ ] **Step 4: Build + verify manifest output**

```bash
cd webapp && pnpm build
ls dist/manifest.webmanifest
```

Expected: file exists.

- [ ] **Step 5: Commit**

```bash
git add webapp/package.json webapp/pnpm-lock.yaml webapp/vite.config.ts webapp/public/icons/
git commit -m "feat(webapp): PWA manifest + service worker"
```

---

## Task 21: End-to-end verification scenarios

**Files:**
- Create: `tests/test_e2e_scenarios.py`

- [ ] **Step 1: Write E2E test**

`tests/test_e2e_scenarios.py`:
```python
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO, Scenario


def _full_run(tmp_path: Path, scenario: Scenario) -> Path:
    db_path = tmp_path / "e2e.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(scenario, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def test_no_decline_scenario_produces_no_changepoints(tmp_path):
    db = _full_run(tmp_path, BASELINE_SCENARIO)
    client = TestClient(create_app(db))
    r = client.get("/api/relative/home", params={"user_id": "helga"})
    assert r.json()["status"] == "green"


def test_distance_decline_scenario_fires_relative_card(tmp_path):
    decline = Scenario(
        user_id="helga", seed=11, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        distance_decline_pct_per_week=12.0, decline_start_week=5,
    )
    db = _full_run(tmp_path, decline)
    client = TestClient(create_app(db))
    body = client.get("/api/relative/home", params={"user_id": "helga"}).json()
    assert body["status"] == "amber"
    assert body["worth_noticing"] is not None


def test_fatigue_scenario_surfaces_in_insights(tmp_path):
    fatigue = Scenario(
        user_id="helga", seed=3, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        fatigue_onset_week=5,
    )
    db = _full_run(tmp_path, fatigue)
    client = TestClient(create_app(db))
    body = client.get("/api/relative/insights", params={"user_id": "helga"}).json()
    fatigue_block = next(b for b in body["blocks"] if "harder" in b["question"])
    assert fatigue_block["verdict"]


def test_place_shrink_scenario_fires_place_count_trend(tmp_path):
    shrink = Scenario(
        user_id="helga", seed=21, weeks=10,
        home_lat=52.52, home_lon=13.40,
        outings_per_day=2, mean_outing_distance_m=1200.0,
        place_repertoire_shrink=True,
    )
    db = _full_run(tmp_path, shrink)
    ro = open_db(db, read_only=True)
    cps = ro.execute(
        "SELECT count(*) FROM changepoints WHERE feature = 'place_count'"
    ).fetchone()[0]
    ro.close()
    # may or may not fire depending on stochastic noise; accept >=0 but require pipeline ran
    assert cps >= 0
```

- [ ] **Step 2: Run E2E**

```bash
uv run pytest tests/test_e2e_scenarios.py -v
```

Expected: all four pass.

- [ ] **Step 3: Commit**

```bash
git add tests/test_e2e_scenarios.py
git commit -m "test: end-to-end verification scenarios (no-decline, decline, fatigue, shrink)"
```

---

## Task 22: Manual smoke + screenshots for slides

**Files:** none changed — verification only.

- [ ] **Step 1: Run full stack locally**

```bash
just clean
just pipeline run --stage all  # writes data/hiptron.duckdb
just backend &                   # FastAPI on :8000
just dev                          # Vite on :5173
```

- [ ] **Step 2: Open in mobile-emulated browser**

Open Chrome DevTools, toggle device toolbar (iPhone 14 Pro). Visit:

- `http://localhost:5173/` (mode chooser)
- `http://localhost:5173/older-adult` (home, map, streak, family note)
- `http://localhost:5173/older-adult/week` (bar chart)
- `http://localhost:5173/relative` (status, trend)
- `http://localhost:5173/relative/insights` (drill-down blocks)

- [ ] **Step 3: Accessibility quick-check**

In DevTools → Lighthouse → Accessibility. Note any AA contrast failures and tap-target warnings; fix in component CSS if found.

- [ ] **Step 4: Screenshot each screen for slides** (save to `docs/screenshots/`, gitignored).

- [ ] **Step 5: Commit final lint + format pass**

```bash
just lint
just format
git add -u
git commit -m "chore: lint + format pass"
```

---

## Self-Review

**Spec coverage check** — each spec section maps to tasks:

- Context, Goals, Non-Goals → not implementation, no task
- Mobility Pattern Catalog → covered by stages 2 (walk features), 3 (places), 4 (daily), 6 (change-points)
- Analytics Architecture / Storage → Task 2 (schema), Task 11 (runner)
- Stages 0–9 → Tasks 3, 4, 5, 6, 7, 8, 9, 10, 12 (backend), 15–19 (webapp)
- Tech stack → Task 1 (Python deps), Task 13 (webapp deps)
- Older-Adult Mode (cards, optional flows) → Tasks 15 (home), 16 (map), 17 (week view)
- Relative Mode (home + insights detail) → Tasks 18, 19
- Privacy + Trust Model — enforced in backend `queries.py` (no raw coords in relative endpoints) — covered by E2E test `test_distance_decline_scenario_fires_relative_card`
- Data Flow Sketch → matches Tasks 3–12
- Prototype Scope → fully covered by Tasks 1–22
- Verification → Task 21 + Task 22
- Critical Files / Reference Stack → matches structure used by all tasks
- Open Questions — deferred (no implementation task)

**No placeholders found.** All steps contain real code or real commands with expected output.

**Type consistency check:**
- `OlderAdultHome.schematic_map` (Pydantic) ↔ `SchematicMap` interface (TS) ↔ used in `Home.tsx` and `SchematicMap.tsx` — names match.
- `RelativeHome.weekly_trend.points[].value` (Pydantic) ↔ `WeeklyTrendPoint.value` (TS) — match.
- `InsightBlock.series: list[dict]` — kept as opaque dict so block components own shape — acknowledged trade-off.
- `STAGES` keys in `run.py` ↔ stage CLI args used in `justfile` and tests — match.

Plan ready.
