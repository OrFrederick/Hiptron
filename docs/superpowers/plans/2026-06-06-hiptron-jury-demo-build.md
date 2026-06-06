# Hiptron Jury-Demo Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the prototype demo-solid for a live OneAIM jury — 4 switchable personas, a real life-space radius, outing-frequency replacing dead fatigue, an all-clear reassurance, an in-app persona switcher, and a robust schematic map.

**Architecture:** GPS → DuckDB pipeline (7 stages) → FastAPI (read-only) → React PWA. The DB and pipeline are already multi-user (every stage iterates `SELECT DISTINCT user_id`). Work threads `userId` through the frontend, fixes two verified correctness bugs in the pipeline, swaps one tracked feature, and hardens the map.

**Tech Stack:** Python 3.12, DuckDB, FastAPI/Pydantic, pytest; React 18 + TS + Vite + Tailwind + recharts + react-router; vitest; Playwright (driver in `~/.npm/_npx`).

**Spec:** `docs/superpowers/specs/2026-06-06-hiptron-jury-demo-build-design.md`

---

## File map

**Pipeline / backend (Python)**
- Modify `hiptron/pipeline/stages/_04_daily_aggregate.py` — real home-anchored radius.
- Modify `hiptron/pipeline/stages/_05_baselines.py` + `_06_changepoints.py` — `TRACKED_FEATURES`: drop `fatigue_index`, add `n_outings`.
- Modify `hiptron/pipeline/stages/_07_insights.py` — templates: drop fatigue, add `n_outings`.
- Modify `hiptron/backend/queries.py` — `_feature_de`, `insights_detail` chart list + persona-name, all-clear default.
- Modify `hiptron/synthetic/scenarios.py` — Scenario fields + 4 personas.
- Modify `hiptron/synthetic/generator.py` — outings taper + per-persona place subset.
- Modify `hiptron/synthetic/__main__.py` — `--scenario all`.

**Frontend (TS)**
- Create `webapp/src/shared/persona.ts`, `webapp/src/shared/PersonaSwitcher.tsx`, `webapp/src/modes/relative/insights/OutingsBlock.tsx`.
- Modify `webapp/src/shared/api.ts`, `App.tsx`, both `Home.tsx`, `InsightsDetail.tsx`, `WeekView.tsx`, `SchematicMap.tsx`.
- Create `webapp/tests/schematicMap.test.ts`.

**Tests**
- Rewrite `tests/test_e2e_scenarios.py` — per-persona signatures, cross-user isolation, ingrid all-clear; add radius invariant.

---

## Phase A — Pipeline correctness & signals

### Task 1: Real life-space radius

**Files:**
- Modify: `hiptron/pipeline/stages/_04_daily_aggregate.py`
- Test: `tests/test_radius.py` (create)

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_radius.py -v`
Expected: FAIL — current radius is `MAX(distance/2)` (~390 m), so `max_radius < max_dist/2` is false.

- [ ] **Step 3: Rewrite the stage-4 SQL**

Replace the whole `SQL = """..."""` block in `_04_daily_aggregate.py` with:

```python
SQL = """
INSERT INTO daily_features
WITH home AS (
    SELECT user_id, median(lat) AS hlat, median(lon) AS hlon
    FROM gps_fixes
    GROUP BY user_id
),
daily_base AS (
    SELECT
        w.user_id,
        CAST(w.start_ts AS DATE) AS date,
        COALESCE(SUM(wf.distance_m), 0) AS total_distance_m,
        COUNT(DISTINCT w.walk_id) AS n_outings,
        COALESCE(SUM(wf.duration_s), 0) / 60.0 AS time_outdoors_min,
        AVG(NULLIF(wf.speed_third_delta_pct, 0)) AS fatigue_index,
        COUNT(DISTINCT v.place_id) AS place_count
    FROM walks w
    JOIN walk_features wf ON wf.walk_id = w.walk_id
    LEFT JOIN walk_place_visits v ON v.walk_id = w.walk_id
    GROUP BY w.user_id, CAST(w.start_ts AS DATE)
),
radius AS (
    SELECT
        w.user_id,
        CAST(w.start_ts AS DATE) AS date,
        MAX(
            2 * 6371000 * asin(sqrt(
                pow(sin(radians(g.lat - h.hlat) / 2), 2)
                + cos(radians(h.hlat)) * cos(radians(g.lat))
                  * pow(sin(radians(g.lon - h.hlon) / 2), 2)
            ))
        ) AS activity_radius_m
    FROM walks w
    JOIN gps_fixes g
      ON g.user_id = w.user_id AND g.ts BETWEEN w.start_ts AND w.end_ts
    JOIN home h ON h.user_id = w.user_id
    GROUP BY w.user_id, CAST(w.start_ts AS DATE)
)
SELECT
    b.user_id,
    b.date,
    b.total_distance_m,
    b.n_outings,
    b.time_outdoors_min,
    COALESCE(r.activity_radius_m, 0) AS activity_radius_m,
    b.fatigue_index,
    b.place_count
FROM daily_base b
LEFT JOIN radius r ON r.user_id = b.user_id AND r.date = b.date
"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_radius.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_04_daily_aggregate.py tests/test_radius.py
git commit -m "fix(pipeline): real home-anchored life-space radius (was MAX(distance/2))"
```

---

### Task 2: Replace fatigue_index with n_outings as the tracked signal

**Files:**
- Modify: `hiptron/pipeline/stages/_05_baselines.py:10-15`
- Modify: `hiptron/pipeline/stages/_06_changepoints.py:10-15`
- Modify: `hiptron/pipeline/stages/_07_insights.py:12-45`
- Modify: `hiptron/backend/queries.py` (`_feature_de`, `insights_detail` chart list + persona name)

- [ ] **Step 1: Update `TRACKED_FEATURES` in both stages**

In `_05_baselines.py` AND `_06_changepoints.py`, replace the tuple with:

```python
TRACKED_FEATURES = (
    "total_distance_m",
    "activity_radius_m",
    "n_outings",
    "place_count",
)
```

- [ ] **Step 2: Swap templates in `_07_insights.py`**

In `TEMPLATES`, delete the two `("fatigue_index", "down", …)` entries and add:

```python
    ("n_outings", "down", "older_adult"): (
        "outings_down_older",
        "Diese Woche etwas weniger draußen — ganz nach Gefühl.",
    ),
    ("n_outings", "down", "relative"): (
        "outings_down_relative",
        "Geht aktuell ~{pct_delta:.0f}% seltener raus als im 4-Wochen-Mittel.",
    ),
```

(`pct_delta` is negative for "down"; the `:.0f` prints e.g. `-35`. Keep parity with the existing distance template which does the same.)

- [ ] **Step 3: Update backend `_feature_de` and `insights_detail`**

In `hiptron/backend/queries.py`, replace `_feature_de` body dict with:

```python
    return {
        "total_distance_m": "Gehstrecke",
        "activity_radius_m": "Aktionsradius",
        "n_outings": "Ausgänge",
        "place_count": "Ortsvielfalt",
    }.get(feature, feature)
```

Add a display-name helper above `insights_detail`:

```python
def _display_name(user_id: str) -> str:
    return {
        "helga": "Helga",
        "otto": "Otto",
        "margarete": "Margarete",
        "ingrid": "Ingrid",
    }.get(user_id, user_id.capitalize())
```

Replace the `chart_data` list in `insights_detail` with:

```python
        name = _display_name(user_id)
        chart_data: list[tuple[str, str, Literal["line", "bar", "places", "list"]]] = [
            ("total_distance_m", f"Wie weit geht {name}?", "bar"),
            ("activity_radius_m", "Bleibt der Aktionsradius gleich?", "line"),
            ("n_outings", "Geht sie regelmäßig raus?", "bar"),
            ("place_count", "Wo war sie unterwegs?", "places"),
        ]
```

- [ ] **Step 4: Verify nothing references the removed feature**

Run: `grep -rn "fatigue_index" hiptron/`
Expected: only `_04_daily_aggregate.py` (the column is still computed/stored — that's fine; it's just no longer tracked or templated). No hits in `_05`, `_06`, `_07`, `queries.py`.

- [ ] **Step 5: Commit**

```bash
git add hiptron/pipeline/stages/_05_baselines.py hiptron/pipeline/stages/_06_changepoints.py hiptron/pipeline/stages/_07_insights.py hiptron/backend/queries.py
git commit -m "feat(pipeline): track outing-frequency (n_outings); retire dead fatigue signal"
```

(E2E tests that referenced fatigue are rewritten in Task 9.)

---

## Phase B — Personas & richer data

### Task 3: Generator knobs — outings taper + per-persona place subset

**Files:**
- Modify: `hiptron/synthetic/scenarios.py` (Scenario dataclass fields)
- Modify: `hiptron/synthetic/generator.py`
- Test: `tests/test_generator.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_generator.py
from hiptron.synthetic.generator import _outings_for_week, _places_for_week
from hiptron.synthetic.scenarios import DEFAULT_PLACES, Scenario


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_generator.py -v`
Expected: FAIL — `_outings_for_week` undefined; `Scenario` has no `outings_decline_start_week`/`places`.

- [ ] **Step 3: Add Scenario fields**

In `hiptron/synthetic/scenarios.py`, add to the `Scenario` dataclass (after `place_repertoire_shrink`):

```python
    outings_decline_start_week: int | None = None
    places: tuple["NamedPlace", ...] | None = None
```

(Keep `end_dt` last. `NamedPlace` is already defined above, so the forward-ref string is safe.)

- [ ] **Step 4: Add `_outings_for_week` and update `_places_for_week`**

In `hiptron/synthetic/generator.py`, add:

```python
def _outings_for_week(scenario: Scenario, week_idx: int) -> int:
    base = scenario.outings_per_day
    start = scenario.outings_decline_start_week
    if start is None or week_idx < start:
        return base
    # Drop ~1 outing every 3 weeks after start, floor at 1.
    weeks_in = week_idx - start
    return max(1, base - 1 - weeks_in // 3)
```

Replace `_places_for_week` with:

```python
def _places_for_week(
    scenario: Scenario, week_idx: int, rng: random.Random
) -> tuple[NamedPlace, ...]:
    base = scenario.places if scenario.places is not None else DEFAULT_PLACES
    if not scenario.place_repertoire_shrink:
        return base
    keep = max(2, len(base) - week_idx // 2)
    return base[:keep]
```

- [ ] **Step 5: Use the taper in `generate`**

In `generate`, inside the `while day <= end_date:` loop, replace `for _ in range(scenario.outings_per_day):` with:

```python
        n_out = _outings_for_week(scenario, week_idx)
        for _ in range(n_out):
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `uv run pytest tests/test_generator.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add hiptron/synthetic/scenarios.py hiptron/synthetic/generator.py tests/test_generator.py
git commit -m "feat(synthetic): outings-taper knob + per-persona place subset"
```

---

### Task 4: Define 4 personas + seed-all CLI

**Files:**
- Modify: `hiptron/synthetic/scenarios.py` (scenario constants + `SCENARIOS`)
- Modify: `hiptron/synthetic/__main__.py` (`--scenario all`)
- Test: `tests/test_generator.py` (append)

- [ ] **Step 1: Append a registry test**

```python
# append to tests/test_generator.py
from hiptron.synthetic.scenarios import SCENARIOS


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_generator.py::test_personas_have_distinct_user_ids -v`
Expected: FAIL — current `SCENARIOS` keys are `baseline/decline/fatigue/shrink/combined`, all user `helga`.

- [ ] **Step 3: Replace the scenario constants + registry**

In `hiptron/synthetic/scenarios.py`, replace everything from `BASELINE_SCENARIO = ...` through the `SCENARIOS = {...}` block with:

```python
HELGA_SCENARIO = Scenario(
    user_id="helga",
    seed=7,
    weeks=12,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    distance_decline_pct_per_week=18.0,
    decline_start_week=6,
)

OTTO_SCENARIO = Scenario(
    user_id="otto",
    seed=21,
    weeks=12,
    home_lat=50.7753,
    home_lon=6.0839,
    outings_per_day=2,
    mean_outing_distance_m=1100.0,
    place_repertoire_shrink=True,
)

MARGARETE_SCENARIO = Scenario(
    user_id="margarete",
    seed=33,
    weeks=12,
    home_lat=48.1351,
    home_lon=11.5820,
    outings_per_day=3,
    mean_outing_distance_m=1000.0,
    outings_decline_start_week=6,
)

INGRID_SCENARIO = Scenario(
    user_id="ingrid",
    seed=99,
    weeks=12,
    home_lat=53.5511,
    home_lon=9.9937,
    outings_per_day=2,
    mean_outing_distance_m=1300.0,
)


SCENARIOS = {
    "helga": HELGA_SCENARIO,
    "otto": OTTO_SCENARIO,
    "margarete": MARGARETE_SCENARIO,
    "ingrid": INGRID_SCENARIO,
}
```

- [ ] **Step 4: Add `--scenario all` to the seed CLI**

In `hiptron/synthetic/__main__.py`, change `seed` to accept the literal `"all"`:

```python
def seed(db_path: Path | str, scenario_name: str, *, replace: bool) -> None:
    names = list(SCENARIOS) if scenario_name == "all" else [scenario_name]
    for name in names:
        if name not in SCENARIOS:
            raise SystemExit(f"unknown scenario: {name} (known: {list(SCENARIOS)})")
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    try:
        for name in names:
            scenario = SCENARIOS[name]
            if replace:
                con.execute("DELETE FROM gps_fixes WHERE user_id = ?", (scenario.user_id,))
            print(f"[seed] scenario={name} user={scenario.user_id} weeks={scenario.weeks}")
            generate(scenario, con)
            n = con.execute(
                "SELECT count(*) FROM gps_fixes WHERE user_id = ?", (scenario.user_id,)
            ).fetchone()[0]
            print(f"[seed] gps_fixes for {scenario.user_id}: {n}")
    finally:
        con.close()
```

Change the argparse `--scenario` line to allow `all`:

```python
    s.add_argument("--scenario", default="all", choices=[*SCENARIOS, "all"])
```

- [ ] **Step 5: Run tests**

Run: `uv run pytest tests/test_generator.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add hiptron/synthetic/scenarios.py hiptron/synthetic/__main__.py tests/test_generator.py
git commit -m "feat(synthetic): four demo personas (helga/otto/margarete/ingrid) + seed --scenario all"
```

---

## Phase C — Backend reassurance

### Task 5: All-clear default for the older-adult trend card

**Files:**
- Modify: `hiptron/backend/queries.py` (`_latest_older_adult_trend_text`)
- Test: `tests/test_e2e_scenarios.py` (covered in Task 9; behaviour change only here)

- [ ] **Step 1: Change the helper to default to reassurance**

In `hiptron/backend/queries.py`, replace `_latest_older_adult_trend_text` with:

```python
ALL_CLEAR_OLDER = "Schöne, gleichmäßige Woche. Weiter so."


def _latest_older_adult_trend_text(con: duckdb.DuckDBPyConnection, user_id: str) -> str:
    row = con.execute(
        """
        SELECT payload_json FROM insights
        WHERE user_id = ? AND audience = 'older_adult'
        ORDER BY created_ts DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not row:
        return ALL_CLEAR_OLDER
    return str(json.loads(row[0])["text"])
```

Note: return type narrows from `str | None` to `str`. `OlderAdultHome.trend_card` stays `str | None` (still optional in the model); always passing a string is valid.

- [ ] **Step 2: Manual check via a one-off run (no new test yet)**

Run: `uv run python -c "print('all-clear default wired')"`
Expected: prints the line (sanity; the real assertion is the ingrid test in Task 9).

- [ ] **Step 3: Commit**

```bash
git add hiptron/backend/queries.py
git commit -m "feat(backend): older-adult trend card defaults to all-clear reassurance"
```

---

## Phase D — Frontend

### Task 6: Persona context + in-app switcher + thread userId

**Files:**
- Create: `webapp/src/shared/persona.ts`
- Create: `webapp/src/shared/PersonaSwitcher.tsx`
- Modify: `webapp/src/modes/older-adult/Home.tsx`, `webapp/src/modes/relative/Home.tsx`, `webapp/src/modes/relative/InsightsDetail.tsx`, `webapp/src/modes/older-adult/WeekView.tsx`, `webapp/src/App.tsx`

- [ ] **Step 1: Create the persona module**

```ts
// webapp/src/shared/persona.ts
import { useSearchParams } from "react-router-dom";

export const PERSONAS = [
  { id: "helga", name: "Helga" },
  { id: "otto", name: "Otto" },
  { id: "margarete", name: "Margarete" },
  { id: "ingrid", name: "Ingrid" },
] as const;

export function usePersona(): string {
  const [params] = useSearchParams();
  const u = params.get("u");
  return PERSONAS.some((p) => p.id === u) ? (u as string) : "helga";
}

export function withPersona(path: string, userId: string): string {
  return `${path}?u=${userId}`;
}
```

- [ ] **Step 2: Create the switcher component**

```tsx
// webapp/src/shared/PersonaSwitcher.tsx
import { useSearchParams } from "react-router-dom";

import { PERSONAS, usePersona } from "./persona";

export function PersonaSwitcher() {
  const [params, setParams] = useSearchParams();
  const current = usePersona();
  return (
    <label className="flex items-center justify-end gap-2 text-xs text-warm-800/60">
      <span className="uppercase tracking-wide">Demo-Person</span>
      <select
        className="rounded-lg border border-warm-200 bg-white px-2 py-1 text-sm text-warm-900"
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("u", e.target.value);
          setParams(next, { replace: true });
        }}
      >
        {PERSONAS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Thread `usePersona()` into the relative pages**

In `webapp/src/modes/relative/Home.tsx`: add imports and pass the id.

```tsx
import { usePersona } from "../../shared/persona";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
```

Change `const { data, isLoading, isError } = useRelativeHome();` to:

```tsx
  const userId = usePersona();
  const { data, isLoading, isError } = useRelativeHome(userId);
```

Add `<PersonaSwitcher />` as the first child inside the returned `<main>` (before `<StatusCard …>`).

In `webapp/src/modes/relative/InsightsDetail.tsx`:

```tsx
import { usePersona } from "../../shared/persona";
```

Change `const { data, isLoading } = useRelativeInsights();` to:

```tsx
  const userId = usePersona();
  const { data, isLoading } = useRelativeInsights(userId);
```

Change the back-link to preserve persona: `<Link to={\`/relative?u=${userId}\`} …>`.

- [ ] **Step 4: Thread `usePersona()` into the older-adult pages**

In `webapp/src/modes/older-adult/Home.tsx`:

```tsx
import { usePersona } from "../../shared/persona";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
```

Change `const { data, isLoading, isError } = useOlderAdultHome();` to:

```tsx
  const userId = usePersona();
  const { data, isLoading, isError } = useOlderAdultHome(userId);
```

Add `<PersonaSwitcher />` as the first child inside `<main>`. Change the week link to `to={\`/older-adult/week?u=${userId}\`}`.

In `webapp/src/modes/older-adult/WeekView.tsx`: add `import { usePersona } from "../../shared/persona";`. Replace the hardcoded `const { data } = useRelativeInsights("helga");` (line 15) with:

```tsx
  const userId = usePersona();
  const { data } = useRelativeInsights(userId);
```

Change the back-link `<Link to="/older-adult" …>` to `<Link to={\`/older-adult?u=${userId}\`} …>`.

- [ ] **Step 5: Preserve persona on the mode-chooser links**

In `webapp/src/App.tsx`, `ModeChooser` currently links to `/older-adult` and `/relative`. Wrap with persona:

```tsx
import { usePersona } from "./shared/persona";
import { PersonaSwitcher } from "./shared/PersonaSwitcher";
```

Inside `ModeChooser`, add `const userId = usePersona();`, render `<PersonaSwitcher />` above the buttons, and change the two `to=` props to `` `/older-adult?u=${userId}` `` and `` `/relative?u=${userId}` ``.

- [ ] **Step 6: Verify build + lint**

Run: `cd webapp && pnpm lint && pnpm build`
Expected: no errors. (TypeScript will flag any missed hook-arg or import.)

- [ ] **Step 7: Commit**

```bash
git add webapp/src/shared/persona.ts webapp/src/shared/PersonaSwitcher.tsx webapp/src/App.tsx webapp/src/modes
git commit -m "feat(webapp): in-app persona switcher + thread userId via ?u= param"
```

---

### Task 7: OutingsBlock + dispatch swap

**Files:**
- Create: `webapp/src/modes/relative/insights/OutingsBlock.tsx`
- Modify: `webapp/src/modes/relative/InsightsDetail.tsx`

- [ ] **Step 1: Create the OutingsBlock**

```tsx
// webapp/src/modes/relative/insights/OutingsBlock.tsx
import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function OutingsBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((row) => ({
    date: String(row.date ?? "").slice(5),
    value: Number(row.value ?? 0),
  }));
  const baseline = Number(block.series[0]?.baseline ?? 0);
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        {block.question}
      </p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <div className="h-40 mt-3">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Bar dataKey="value" fill="#7BA688" radius={[4, 4, 0, 0]} />
            {baseline > 0 && (
              <ReferenceLine
                y={baseline}
                stroke="#3D2F22"
                strokeDasharray="3 3"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-warm-800/60 mt-2">
        Balken = Ausgänge pro Tag. Gestrichelte Linie = Mittelwert.
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Update the dispatch in `InsightsDetail.tsx`**

Remove the `FatigueBlock` import and its dispatch line; add `OutingsBlock`. The `BlockFor` becomes:

```tsx
import { ChangepointsBlock } from "./insights/ChangepointsBlock";
import { DistanceBlock } from "./insights/DistanceBlock";
import { OutingsBlock } from "./insights/OutingsBlock";
import { PlacesBlock } from "./insights/PlacesBlock";
import { RoutineBlock } from "./insights/RoutineBlock";

// ...

function BlockFor({ block }: { block: InsightBlock }) {
  if (block.feature === "total_distance_m")
    return <DistanceBlock block={block} />;
  if (block.feature === "activity_radius_m")
    return <RoutineBlock block={block} />;
  if (block.feature === "n_outings") return <OutingsBlock block={block} />;
  if (block.feature === "place_count") return <PlacesBlock block={block} />;
  if (block.chart_kind === "list") return <ChangepointsBlock block={block} />;
  return null;
}
```

(`FatigueBlock.tsx` may stay on disk unused, or be deleted — deletion is optional and not required for the build.)

- [ ] **Step 3: Verify build + lint**

Run: `cd webapp && pnpm lint && pnpm build`
Expected: no errors (lint runs with `--max-warnings 0`; the removed `FatigueBlock` import must be gone).

- [ ] **Step 4: Commit**

```bash
git add webapp/src/modes/relative/insights/OutingsBlock.tsx webapp/src/modes/relative/InsightsDetail.tsx
git commit -m "feat(webapp): outing-frequency insight block; drop fatigue block from dispatch"
```

---

### Task 8: SchematicMap robustness

**Files:**
- Modify: `webapp/src/modes/older-adult/SchematicMap.tsx`
- Test: `webapp/tests/schematicMap.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// webapp/tests/schematicMap.test.ts
import { describe, expect, it } from "vitest";

import { PADDING, VIEW_SIZE, projectPoints } from "../src/modes/older-adult/SchematicMap";
import type { SchematicMap } from "../src/shared/types";

function inBounds(x: number, y: number) {
  return (
    x >= PADDING &&
    x <= VIEW_SIZE - PADDING &&
    y >= PADDING &&
    y <= VIEW_SIZE - PADDING
  );
}

const base: SchematicMap = {
  home_lat: 52.52,
  home_lon: 13.405,
  places: [
    { place_id: "a", label: "bakery", centroid_lat: 52.521, centroid_lon: 13.406 },
    { place_id: "b", label: "park", centroid_lat: 52.519, centroid_lon: 13.404 },
  ],
  walk_polyline: [
    [52.52, 13.405],
    [52.5215, 13.4065],
    [52.519, 13.404],
  ],
};

describe("projectPoints", () => {
  it("clamps every point inside the padded viewport", () => {
    const { homePx, places, polyline } = projectPoints(base);
    expect(inBounds(homePx[0], homePx[1])).toBe(true);
    for (const p of places) expect(inBounds(p.x, p.y)).toBe(true);
    for (const [x, y] of polyline) expect(inBounds(x, y)).toBe(true);
  });

  it("handles empty polyline and a single place without throwing", () => {
    const sparse: SchematicMap = {
      ...base,
      places: [base.places[0]],
      walk_polyline: [],
    };
    const { places, polyline } = projectPoints(sparse);
    expect(polyline).toEqual([]);
    expect(places).toHaveLength(1);
    expect(inBounds(places[0].x, places[0].y)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webapp && pnpm vitest run tests/schematicMap.test.ts`
Expected: FAIL — `PADDING`, `VIEW_SIZE`, `projectPoints` are not exported.

- [ ] **Step 3: Export the constants/function and clamp inside `project`**

In `webapp/src/modes/older-adult/SchematicMap.tsx`:

Change `const VIEW_SIZE = 320;` → `export const VIEW_SIZE = 320;` and `const PADDING = 32;` → `export const PADDING = 32;`.

Change `function projectPoints(map: SchematicMapType) {` → `export function projectPoints(map: SchematicMapType) {`.

Inside `projectPoints`, replace the `project` closure with a clamped version:

```typescript
  const lo = PADDING;
  const hi = VIEW_SIZE - PADDING;
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
  const project = (lat: number, lon: number): [number, number] => {
    const x = PADDING + ((lon - minLon) / dLon) * inner;
    const y = VIEW_SIZE - PADDING - ((lat - minLat) / dLat) * inner;
    return [clamp(x), clamp(y)];
  };
```

(The empty-polyline case already maps `[]` → `[]`; no change needed. The single-place case is handled by the existing `Math.max(1e-6, …)` guards on `dLat`/`dLon`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webapp && pnpm vitest run tests/schematicMap.test.ts`
Expected: PASS

- [ ] **Step 5: Verify build + lint**

Run: `cd webapp && pnpm lint && pnpm build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/modes/older-adult/SchematicMap.tsx webapp/tests/schematicMap.test.ts
git commit -m "fix(webapp): clamp schematic-map points inside viewport; export projectPoints + cover with tests"
```

---

## Phase E — Verification

### Task 9: Rewrite the e2e scenario tests

**Files:**
- Rewrite: `tests/test_e2e_scenarios.py`

- [ ] **Step 1: Replace the whole file**

```python
# tests/test_e2e_scenarios.py
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
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


def _changepoint_features(db_path: Path, user_id: str) -> set[str]:
    ro = open_db(db_path, read_only=True)
    rows = ro.execute(
        "SELECT DISTINCT feature FROM changepoints WHERE user_id = ?", (user_id,)
    ).fetchall()
    ro.close()
    return {r[0] for r in rows}


def test_all_personas_have_daily_features(demo_db: Path):
    ro = open_db(demo_db, read_only=True)
    counts = dict(
        ro.execute("SELECT user_id, count(*) FROM daily_features GROUP BY user_id").fetchall()
    )
    ro.close()
    assert set(counts) == {"helga", "otto", "margarete", "ingrid"}
    assert all(c > 0 for c in counts.values())


def test_helga_signature_is_distance_decline(demo_db: Path):
    assert "total_distance_m" in _changepoint_features(demo_db, "helga")


def test_otto_signature_is_place_repertoire(demo_db: Path):
    assert "place_count" in _changepoint_features(demo_db, "otto")


def test_margarete_signature_is_outing_frequency(demo_db: Path):
    assert "n_outings" in _changepoint_features(demo_db, "margarete")


def test_ingrid_is_all_clear(demo_db: Path):
    # Healthy control: no relative alert -> green status.
    client = TestClient(create_app(demo_db))
    body = client.get("/api/relative/home", params={"user_id": "ingrid"}).json()
    assert body["status"] == "green"
    # Older-adult home shows a reassurance trend card, never empty.
    oa = client.get("/api/older-adult/home", params={"user_id": "ingrid"}).json()
    assert oa["trend_card"]


def test_cross_user_isolation(demo_db: Path):
    # ingrid must not inherit helga's decline changepoint.
    assert "total_distance_m" not in _changepoint_features(demo_db, "ingrid")


def test_insights_detail_uses_persona_name(demo_db: Path):
    client = TestClient(create_app(demo_db))
    body = client.get("/api/relative/insights", params={"user_id": "otto"}).json()
    questions = " ".join(b["question"] for b in body["blocks"])
    assert "Otto" in questions
    # The retired fatigue block is gone; outings block is present.
    features = {b.get("feature") for b in body["blocks"]}
    assert "n_outings" in features
    assert "fatigue_index" not in features
```

- [ ] **Step 2: Run the full Python suite**

Run: `uv run pytest -v`
Expected: PASS. If `test_margarete_signature_is_outing_frequency` fails, the taper is too gentle — in `scenarios.py` lower `MARGARETE_SCENARIO.outings_decline_start_week` to `5` and/or raise `outings_per_day` to `4`, then re-run. If `test_helga_signature_is_distance_decline` fails, raise `distance_decline_pct_per_week` toward `22.0`.

- [ ] **Step 3: Commit**

```bash
git add tests/test_e2e_scenarios.py
git commit -m "test: per-persona signature insights + cross-user isolation + ingrid all-clear"
```

---

### Task 10: Reseed, run pipeline, drive the app

**Files:** none (operational verification)

- [ ] **Step 1: Rebuild the demo DB with all four personas**

Run:
```bash
rm -f data/hiptron.duckdb data/hiptron.duckdb.wal
uv run python -m hiptron.synthetic seed --scenario all --replace
uv run python -m hiptron.pipeline run --stage all
```
Expected: seed prints four users; pipeline prints all 7 stages with no error.

- [ ] **Step 2: Smoke-test every endpoint per persona**

Run:
```bash
uv run uvicorn hiptron.backend.main:app --port 8001 &
sleep 2
for u in helga otto margarete ingrid; do
  echo "== $u =="
  curl -sf "http://localhost:8001/api/relative/home?user_id=$u" | head -c 120; echo
done
```
Expected: helga/otto/margarete return `"status":"amber"`; ingrid returns `"status":"green"`.

- [ ] **Step 3: Drive the UI with the existing Playwright driver**

Adapt `/tmp/drive.mjs` to loop personas: for each `u` in `[helga, otto, margarete, ingrid]`, visit `http://localhost:5174/relative?u=${u}`, `/relative/insights?u=${u}`, `/older-adult?u=${u}`, screenshot, assert no console errors and that the map SVG has ≥1 `<circle>`.

Run: `cd webapp && pnpm dev & sleep 3 && node /tmp/drive.mjs`
Expected: screenshots written for each persona × screen; no console errors; otto's map differs from helga's.

- [ ] **Step 4: Eyeball the screenshots**

Read the older-adult-home and relative-insights screenshots for each persona. Confirm: switcher visible, charts populated, radius chart no longer flat-equal to half-distance, ingrid shows reassurance.

- [ ] **Step 5: Commit any driver tweaks (optional)**

```bash
git add -A && git commit -m "chore: multi-persona playwright screenshot sweep" || echo "nothing to commit"
```

---

## Optional (STRETCH): new-place discovered card

Only if time permits. Adds a positive "neuer Ort entdeckt" note to the older-adult home.

- Scenario: add `discover_place_week: int | None = None`; in the generator, restrict a designated place so it is only visited from that week onward (gives `places.first_seen` a late date). Set `INGRID_SCENARIO.discover_place_week = 8`.
- Backend: add `new_place: str | None = None` to `OlderAdultHome` (`models.py`); in `older_adult_home`, query `SELECT label FROM places WHERE user_id = ? AND first_seen >= (SELECT max(ts) FROM gps_fixes WHERE user_id = ?) - INTERVAL 14 DAY ORDER BY first_seen DESC LIMIT 1`.
- Frontend: add `new_place: string | null` to `OlderAdultHome` in `types.ts`; render a small card in older-adult `Home.tsx` when present.
- Test: assert ingrid's `/api/older-adult/home` returns a non-null `new_place`.

Defer if the signature-insight tests (Task 9) are green and the screenshot sweep looks good.

---

## Self-review

**Spec coverage:** personas (T3/T4), richer data via more weeks + outings + subsets (T3/T4), real radius (T1), n_outings insight (T2/T7), all-clear (T5), switcher (T6), map robustness (T8), tests (T9/T10). New-place is STRETCH (spec SHIP item, deferred with rationale — fragile without generator support; covered as optional). Fatigue intentionally retired per spec AVOID list.

**Placeholder scan:** no TBD/TODO; every code step shows full code or an exact edit anchor.

**Type consistency:** `TRACKED_FEATURES` identical in `_05`/`_06`; `n_outings` used consistently across stages, templates, `_feature_de`, `chart_data`, dispatch (`feature === "n_outings"`), and tests. `projectPoints`/`PADDING`/`VIEW_SIZE` exported names match the test imports. `usePersona()` returns a string used uniformly as the hook arg and `?u=` value.
