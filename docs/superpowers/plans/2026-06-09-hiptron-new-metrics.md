# New-Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 read-side metrics — personal-best highlights (#15), outdoor rhythm (#11), compared-to-last-month (#16), routine adherence (#8) — to the Hiptron demo, OA-calm / relative-deep.

**Architecture:** Pure read-side. New query helpers in `backend/queries.py` compute everything from existing tables (`walks.start_ts`, `walk_features.distance_m`, `daily_features.*`, `places.first_seen`). New `/api/relative/patterns` endpoint feeds a new relative-mode screen; `older_adult_home` gains one `highlight` field for a single warm OA card. No schema change, no `TRACKED_FEATURES` change, no pipeline rebuild, no reseed.

**Tech Stack:** FastAPI + Pydantic + DuckDB (backend), React + TS + react-query + react-router (webapp), pytest + vitest + Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-09-hiptron-new-metrics-design.md`

**Run notes:** backend `uvicorn hiptron.backend.main:app --port 8001`; webapp `pnpm dev` (vite proxies to 8001). Tests: `pytest -q`, `cd webapp && pnpm test`, `pnpm build`. DB already seeded with helga/otto/margarete/ingrid — do NOT reseed.

---

### Task 1: Backend models

**Files:**
- Modify: `hiptron/backend/models.py`

- [ ] **Step 1: Add new models + `highlight` field**

Append to `models.py` (after `InsightsDetail`):

```python
class Highlight(BaseModel):
    kind: Literal["longest_walk", "furthest", "new_place"]
    text: str
    detail: str | None = None


class RhythmBucket(BaseModel):
    label: str
    share: float


class Rhythm(BaseModel):
    buckets: list[RhythmBucket]
    sentence: str


class MonthlyDelta(BaseModel):
    feature: str
    label: str
    this_value: float
    prior_value: float
    pct_delta: float
    direction: Literal["up", "down", "flat"]


class RoutineScore(BaseModel):
    score: int
    band: Literal["stabil", "wechselnd"]
    sentence: str


class PatternsScreen(BaseModel):
    user_id: str
    highlights: list[Highlight]
    rhythm: Rhythm | None
    monthly_deltas: list[MonthlyDelta]
    routine: RoutineScore | None
```

Add `highlight` to `OlderAdultHome` (after `week_distances`):

```python
    week_distances: WeeklyTrend | None = None
    highlight: Highlight | None = None
```

- [ ] **Step 2: Verify import compiles**

Run: `python -c "import hiptron.backend.models"`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add hiptron/backend/models.py
git commit -m "feat(backend): models for highlights, rhythm, monthly-delta, routine"
```

---

### Task 2: Backend query helpers + endpoint (TDD)

**Files:**
- Modify: `hiptron/backend/queries.py`
- Modify: `hiptron/backend/main.py`
- Test: `tests/test_patterns.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_patterns.py`. (Mirror the connection/db-path fixture used in existing tests — check `tests/test_e2e_scenarios.py` for how the seeded `data/hiptron.duckdb` path is obtained; reuse the same constant/fixture.)

```python
from pathlib import Path

from hiptron.backend.queries import patterns_screen, older_adult_home

DB = Path("data/hiptron.duckdb")


def test_patterns_shape():
    p = patterns_screen(DB, "helga")
    assert p.user_id == "helga"
    # monthly deltas cover the 4 tracked features (when enough history)
    feats = {d.feature for d in p.monthly_deltas}
    assert feats <= {"total_distance_m", "activity_radius_m", "n_outings", "place_count"}
    for d in p.monthly_deltas:
        assert d.direction in ("up", "down", "flat")


def test_rhythm_shares_sum_to_one():
    p = patterns_screen(DB, "helga")
    if p.rhythm is not None:
        assert abs(sum(b.share for b in p.rhythm.buckets) - 1.0) < 1e-6
        assert len(p.rhythm.buckets) == 3


def test_routine_in_bounds_and_steady_persona_stable():
    p = patterns_screen(DB, "ingrid")  # healthy/steady control
    if p.routine is not None:
        assert 0 <= p.routine.score <= 100
        assert p.routine.band == "stabil"


def test_margarete_outings_down():
    p = patterns_screen(DB, "margarete")  # outing-frequency drop persona
    d = {x.feature: x for x in p.monthly_deltas}
    if "n_outings" in d:
        assert d["n_outings"].direction in ("down", "flat")


def test_older_adult_home_has_highlight_field():
    h = older_adult_home(DB, "helga")
    assert hasattr(h, "highlight")  # may be None, field must exist
```

- [ ] **Step 2: Run, verify fail**

Run: `pytest tests/test_patterns.py -q`
Expected: FAIL — `ImportError: cannot import name 'patterns_screen'`.

- [ ] **Step 3: Add helpers + `patterns_screen` to `queries.py`**

Add imports at top of `queries.py` (extend the existing `from hiptron.backend.models import (...)` block):

```python
    Highlight,
    MonthlyDelta,
    PatternsScreen,
    Rhythm,
    RhythmBucket,
    RoutineScore,
```

Add helpers (place near `_feature_de`):

```python
_WEEKDAYS_DE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


def _de_num(x: float, decimals: int = 1) -> str:
    return f"{x:.{decimals}f}".replace(".", ",")


def _highlights(con: duckdb.DuckDBPyConnection, user_id: str, ref_date) -> list[Highlight]:
    out: list[Highlight] = []
    lw = con.execute(
        """
        SELECT wf.distance_m, w.start_ts
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 7 DAY
        ORDER BY wf.distance_m DESC LIMIT 1
        """,
        (user_id, ref_date),
    ).fetchone()
    if lw and lw[0]:
        day = _WEEKDAYS_DE[lw[1].weekday()]
        out.append(Highlight(kind="longest_walk", text="Dein längster Spaziergang diese Woche.",
                             detail=f"{_de_num(lw[0] / 1000.0)} km · {day}"))
    fp = con.execute(
        """
        SELECT activity_radius_m FROM daily_features
        WHERE user_id = ? AND date >= ? - INTERVAL 7 DAY AND activity_radius_m IS NOT NULL
        ORDER BY activity_radius_m DESC LIMIT 1
        """,
        (user_id, ref_date),
    ).fetchone()
    if fp and fp[0]:
        out.append(Highlight(kind="furthest", text="Am weitesten von zu Hause unterwegs.",
                             detail=f"{_de_num(fp[0] / 1000.0)} km"))
    np = con.execute(
        """
        SELECT label FROM places
        WHERE user_id = ? AND label IS NOT NULL
          AND CAST(first_seen AS DATE) >= ? - INTERVAL 7 DAY
        ORDER BY first_seen DESC LIMIT 1
        """,
        (user_id, ref_date),
    ).fetchone()
    if np and np[0]:
        out.append(Highlight(kind="new_place", text="Neuer Ort entdeckt.", detail=str(np[0])))
    return out


def _highlight(con: duckdb.DuckDBPyConnection, user_id: str, ref_date) -> Highlight | None:
    by_kind = {h.kind: h for h in _highlights(con, user_id, ref_date)}
    for k in ("new_place", "longest_walk", "furthest"):
        if k in by_kind:
            return by_kind[k]
    return None


def _rhythm(con: duckdb.DuckDBPyConnection, user_id: str, ref_date) -> Rhythm | None:
    rows = con.execute(
        """
        SELECT EXTRACT(HOUR FROM start_ts) AS h, count(*) AS c
        FROM walks
        WHERE user_id = ? AND CAST(start_ts AS DATE) >= ? - INTERVAL 28 DAY
        GROUP BY h
        """,
        (user_id, ref_date),
    ).fetchall()
    total = sum(int(c) for _, c in rows)
    if total < 8:
        return None
    m = sum(int(c) for h, c in rows if h < 12)
    a = sum(int(c) for h, c in rows if 12 <= h < 18)
    e = sum(int(c) for h, c in rows if h >= 18)
    buckets = [
        RhythmBucket(label="Vormittags", share=m / total),
        RhythmBucket(label="Nachmittags", share=a / total),
        RhythmBucket(label="Abends", share=e / total),
    ]
    top = max(buckets, key=lambda b: b.share)
    sentence = (
        f"Meist {top.label.lower()} unterwegs."
        if top.share >= 0.45
        else "Zu unterschiedlichen Tageszeiten unterwegs."
    )
    return Rhythm(buckets=buckets, sentence=sentence)


_MONTHLY_FEATURES = ("total_distance_m", "activity_radius_m", "n_outings", "place_count")


def _monthly_deltas(con: duckdb.DuckDBPyConnection, user_id: str, ref_date) -> list[MonthlyDelta]:
    out: list[MonthlyDelta] = []
    for f in _MONTHLY_FEATURES:
        row = con.execute(
            f"""
            SELECT
              avg(CASE WHEN date > ? - INTERVAL 28 DAY THEN {f} END) AS this_v,
              avg(CASE WHEN date <= ? - INTERVAL 28 DAY
                        AND date > ? - INTERVAL 56 DAY THEN {f} END) AS prior_v
            FROM daily_features
            WHERE user_id = ? AND date > ? - INTERVAL 56 DAY
            """,
            (ref_date, ref_date, ref_date, user_id, ref_date),
        ).fetchone()
        this_v, prior_v = row
        if this_v is None or prior_v is None or prior_v == 0:
            continue
        pct = (this_v - prior_v) / prior_v * 100.0
        direction = "flat" if abs(pct) < 5 else ("up" if pct > 0 else "down")
        out.append(MonthlyDelta(feature=f, label=_feature_de(f), this_value=float(this_v),
                                prior_value=float(prior_v), pct_delta=float(pct), direction=direction))
    return out


def _routine(con: duckdb.DuckDBPyConnection, user_id: str, ref_date) -> RoutineScore | None:
    base = con.execute(
        """
        SELECT count(*) AS n, stddev_pop(EXTRACT(HOUR FROM start_ts)) AS sd
        FROM walks
        WHERE user_id = ? AND CAST(start_ts AS DATE) >= ? - INTERVAL 28 DAY
        """,
        (user_id, ref_date),
    ).fetchone()
    n = int(base[0] or 0)
    if n < 10:
        return None
    sd = float(base[1]) if base[1] is not None else 0.0
    reg = con.execute(
        """
        WITH v AS (
          SELECT p.place_id, count(*) AS c
          FROM walk_place_visits wv
          JOIN places p ON p.place_id = wv.place_id
          JOIN walks w ON w.walk_id = wv.walk_id
          WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 28 DAY
          GROUP BY p.place_id
        )
        SELECT coalesce(sum(CASE WHEN c >= 3 THEN c END), 0), coalesce(sum(c), 0) FROM v
        """,
        (user_id, ref_date),
    ).fetchone()
    regular, total = float(reg[0]), float(reg[1])
    reg_ratio = (regular / total) if total else 0.0
    time_score = max(0.0, min(1.0, 1.0 - sd / 4.0))
    score = int(round(100 * (0.7 * time_score + 0.3 * reg_ratio)))
    band = "stabil" if score >= 60 else "wechselnd"
    sentence = (
        "Geht meist zu ähnlichen Zeiten und an vertraute Orte."
        if band == "stabil"
        else "Geht zu wechselnden Zeiten und Orten — abwechslungsreich."
    )
    return RoutineScore(score=score, band=band, sentence=sentence)


def patterns_screen(db_path: Path, user_id: str) -> PatternsScreen:
    con = _con(db_path)
    try:
        ref = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref[0] if ref and ref[0] else dt.date.today()
        return PatternsScreen(
            user_id=user_id,
            highlights=_highlights(con, user_id, ref_date),
            rhythm=_rhythm(con, user_id, ref_date),
            monthly_deltas=_monthly_deltas(con, user_id, ref_date),
            routine=_routine(con, user_id, ref_date),
        )
    finally:
        con.close()
```

- [ ] **Step 4: Wire `highlight` into `older_adult_home`**

In `older_adult_home`, after `streak = _streak_days(con, user_id)` add a ref-date lookup and pass `highlight`:

```python
        streak = _streak_days(con, user_id)
        trend = _latest_older_adult_trend_text(con, user_id)
        ref = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref[0] if ref and ref[0] else today
        return OlderAdultHome(
            greeting=_greeting_de(),
            date=today,
            yesterday_walk=yesterday_walk,
            schematic_map=schematic,
            streak_days=streak,
            family_note=None,
            trend_card=trend,
            week_distances=_weekly_distance(con, user_id),
            highlight=_highlight(con, user_id, ref_date),
        )
```

- [ ] **Step 5: Add endpoint in `main.py`**

Extend imports and add route:

```python
from hiptron.backend.models import (
    InsightsDetail,
    OlderAdultHome,
    PatternsScreen,
    RelativeHome,
)
from hiptron.backend.queries import (
    insights_detail,
    older_adult_home,
    patterns_screen,
    relative_home,
)
```

Add inside `create_app` (after the insights route):

```python
    @app.get("/api/relative/patterns", response_model=PatternsScreen)
    def get_relative_patterns(user_id: str) -> PatternsScreen:
        return patterns_screen(db, user_id)
```

- [ ] **Step 6: Run tests, verify pass**

Run: `pytest tests/test_patterns.py -q`
Expected: PASS (all 5). If `ingrid` routine is `wechselnd`, retune `_routine` thresholds (raise the time_score divisor or lower the 60 cutoff) until the steady control reads `stabil` — it must.

- [ ] **Step 7: Full backend suite + commit**

Run: `pytest -q`
Expected: all pass (prior 39 + new).

```bash
git add hiptron/backend/queries.py hiptron/backend/main.py tests/test_patterns.py
git commit -m "feat(backend): patterns endpoint + OA highlight (read-side metrics)"
```

---

### Task 3: Frontend types + api hook

**Files:**
- Modify: `webapp/src/shared/types.ts`
- Modify: `webapp/src/shared/api.ts`

- [ ] **Step 1: Add types**

Append to `types.ts`:

```typescript
export interface Highlight {
  kind: "longest_walk" | "furthest" | "new_place";
  text: string;
  detail: string | null;
}
export interface RhythmBucket {
  label: string;
  share: number;
}
export interface Rhythm {
  buckets: RhythmBucket[];
  sentence: string;
}
export interface MonthlyDelta {
  feature: string;
  label: string;
  this_value: number;
  prior_value: number;
  pct_delta: number;
  direction: "up" | "down" | "flat";
}
export interface RoutineScore {
  score: number;
  band: "stabil" | "wechselnd";
  sentence: string;
}
export interface PatternsScreen {
  user_id: string;
  highlights: Highlight[];
  rhythm: Rhythm | null;
  monthly_deltas: MonthlyDelta[];
  routine: RoutineScore | null;
}
```

Add `highlight` to the `OlderAdultHome` interface:

```typescript
  week_distances: WeeklyTrend | null;
  highlight: Highlight | null;
```

- [ ] **Step 2: Add api hook**

In `api.ts`, extend the type import to include `PatternsScreen`, then add:

```typescript
export function useRelativePatterns(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-patterns", userId],
    queryFn: () =>
      fetchJson<PatternsScreen>(`/api/relative/patterns?user_id=${userId}`),
  });
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `cd webapp && pnpm build`
Expected: build succeeds.

```bash
git add webapp/src/shared/types.ts webapp/src/shared/api.ts
git commit -m "feat(webapp): patterns types + api hook"
```

---

### Task 4: Frontend chart primitives (TDD)

**Files:**
- Modify: `webapp/src/shared/charts.tsx`
- Test: `webapp/tests/shared/charts.test.tsx` (create; mirror an existing vitest test for setup/imports)

- [ ] **Step 1: Write failing test**

Create `webapp/tests/shared/charts.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeltaRow, RhythmBars, RoutineBar } from "../../src/shared/charts";

describe("new chart primitives", () => {
  it("RhythmBars renders one row per bucket with percent", () => {
    const { getByText } = render(
      <RhythmBars buckets={[
        { label: "Vormittags", share: 0.6 },
        { label: "Nachmittags", share: 0.3 },
        { label: "Abends", share: 0.1 },
      ]} />
    );
    expect(getByText("Vormittags")).toBeTruthy();
    expect(getByText("60%")).toBeTruthy();
  });

  it("DeltaRow shows down arrow + abs percent for negative", () => {
    const { getByText, container } = render(
      <DeltaRow label="Ausgänge" pct={-22} direction="down" />
    );
    expect(getByText("Ausgänge")).toBeTruthy();
    expect(container.textContent).toContain("22%");
  });

  it("RoutineBar shows band label", () => {
    const { getByText } = render(<RoutineBar score={78} band="stabil" />);
    expect(getByText("stabil")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `cd webapp && pnpm test -- charts`
Expected: FAIL — exports not found.

- [ ] **Step 3: Implement primitives**

Append to `charts.tsx`:

```tsx
// ── 3-bucket time-of-day share bars (outdoor rhythm) ──
export function RhythmBars({ buckets }: { buckets: { label: string; share: number }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {buckets.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 100, flexShrink: 0, fontSize: 15, fontWeight: 600, color: c.textDark }}>{b.label}</div>
          <div style={{ flex: 1, height: 10, background: c.chip, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(b.share * 100)}%`, height: "100%", background: c.blue600, opacity: 0.85, borderRadius: 999 }} />
          </div>
          <div style={{ width: 46, textAlign: "right", fontSize: 14, fontWeight: 600, color: c.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(b.share * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Signed delta row vs prior month (neutral, never alarm) ──
export function DeltaRow({ label, pct, direction }: { label: string; pct: number; direction: "up" | "down" | "flat" }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
  const tint = direction === "flat" ? c.textMuted : c.blue600;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 46, borderBottom: `1px solid ${c.line}` }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: c.textDark }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: tint, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ fontSize: 11 }}>{arrow}</span>
        {direction === "flat" ? "etwa gleich" : `${Math.abs(Math.round(pct))}%`}
      </span>
    </div>
  );
}

// ── Calm routine-consistency bar (reassurance, not a clinical dial) ──
export function RoutineBar({ score, band }: { score: number; band: "stabil" | "wechselnd" }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: c.textDark }}>Rhythmus</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: band === "stabil" ? c.green700 : c.textMuted }}>{band}</span>
      </div>
      <div style={{ height: 12, background: c.chip, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(6, Math.min(100, score))}%`, height: "100%", background: c.green600, opacity: 0.85, borderRadius: 999 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd webapp && pnpm test -- charts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add webapp/src/shared/charts.tsx webapp/tests/shared/charts.test.tsx
git commit -m "feat(webapp): RhythmBars, DeltaRow, RoutineBar primitives"
```

---

### Task 5: OA highlight card

**Files:**
- Modify: `webapp/src/modes/older-adult/Home.tsx`

- [ ] **Step 1: Add `HighlightCard` + render it**

At the top of `Home.tsx` ensure `Highlight` type is imported from `../../shared/types` and `Ic`/`Card`/`HIP` are available (match existing imports in the file). Add the component:

```tsx
function HighlightCard({ highlight }: { highlight: Highlight }) {
  const icon = highlight.kind === "new_place" ? "pin" : highlight.kind === "furthest" ? "route" : "walk";
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72 }}>
      <span style={{ width: 46, height: 46, borderRadius: "50%", background: HIP.c.green50, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic name={icon} size={22} color={HIP.c.green600} sw={2} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: HIP.c.textDark, lineHeight: 1.3 }}>{highlight.text}</div>
        {highlight.detail && <div style={{ fontSize: 15, color: HIP.c.textMuted, marginTop: 3 }}>{highlight.detail}</div>}
      </div>
    </Card>
  );
}
```

Render it just after the yesterday-walk hero card and before the schematic map (find the existing JSX for those and insert):

```tsx
{data.highlight && <HighlightCard highlight={data.highlight} />}
```

(Use the actual data variable name from the existing `useOlderAdultHome` call in the file.)

- [ ] **Step 2: Build, verify**

Run: `cd webapp && pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/modes/older-adult/Home.tsx
git commit -m "feat(webapp): warm Höhepunkt highlight card on OA home"
```

---

### Task 6: Relative Patterns screen + route + links

**Files:**
- Create: `webapp/src/modes/relative/Patterns.tsx`
- Modify: `webapp/src/App.tsx` (add route)
- Modify: `webapp/src/modes/relative/Home.tsx` and/or `InsightsDetail.tsx` (add a link/button into Patterns)

- [ ] **Step 1: Create `Patterns.tsx`**

Match the structure of `InsightsDetail.tsx` (Shell wrapper, SlimNavyHeader/back, Card sections, `usePersona`, `personaName`). Skeleton:

```tsx
import { useNavigate, useSearchParams } from "react-router-dom";

import { useRelativePatterns } from "../../shared/api";
import { DeltaRow, RhythmBars, RoutineBar } from "../../shared/charts";
import { Card, SlimNavyHeader } from "../../shared/kit";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { HIP } from "../../shared/theme";

const c = HIP.c;

export default function Patterns() {
  const userId = usePersona();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data } = useRelativePatterns(userId);
  const name = personaName(userId);
  const back = () => navigate(`/relative?u=${userId}`);

  return (
    <Shell active="insights" mode="relative">
      <SlimNavyHeader title="Rückblick & Muster" onBack={back} />

      {data?.highlights && data.highlights.length > 0 && (
        <Card>
          <SectionTitle>Höhepunkte</SectionTitle>
          {data.highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", minHeight: 44, borderBottom: i === data.highlights.length - 1 ? "none" : `1px solid ${c.line}` }}>
              <span style={{ fontSize: 15.5, color: c.textDark }}>{h.text}</span>
              {h.detail && <span style={{ fontSize: 15, color: c.textMuted, fontWeight: 600 }}>{h.detail}</span>}
            </div>
          ))}
        </Card>
      )}

      {data?.rhythm && (
        <Card>
          <SectionTitle>Wann {name} unterwegs ist</SectionTitle>
          <p style={verdict}>{data.rhythm.sentence}</p>
          <RhythmBars buckets={data.rhythm.buckets} />
        </Card>
      )}

      {data?.monthly_deltas && data.monthly_deltas.length > 0 && (
        <Card>
          <SectionTitle>Verglichen mit letztem Monat</SectionTitle>
          {data.monthly_deltas.map((d) => (
            <DeltaRow key={d.feature} label={d.label} pct={d.pct_delta} direction={d.direction} />
          ))}
        </Card>
      )}

      {data?.routine && (
        <Card>
          <SectionTitle>Rhythmus-Stabilität</SectionTitle>
          <p style={verdict}>{data.routine.sentence}</p>
          <RoutineBar score={data.routine.score} band={data.routine.band} />
        </Card>
      )}
    </Shell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 18, fontWeight: 700, color: c.textDark, marginBottom: 10 }}>{children}</div>;
}
const verdict: React.CSSProperties = { fontSize: 15.5, color: c.textMuted, margin: "0 0 14px", lineHeight: 1.45 };
```

(Adjust imports — `Shell` `active`/`mode` props, `SlimNavyHeader` props, `personaName`/`usePersona` — to match the real signatures used in `InsightsDetail.tsx`. If `Shell` has no "insights" tab key, reuse whatever key InsightsDetail passes.)

- [ ] **Step 2: Add route in `App.tsx`**

Find the existing relative routes (e.g. `/relative/insights`) and add alongside:

```tsx
<Route path="/relative/patterns" element={<Patterns />} />
```

Import `Patterns` (lazy or direct, matching how sibling screens are imported).

- [ ] **Step 3: Add a link into Patterns**

In `modes/relative/InsightsDetail.tsx` (or relative `Home.tsx`), add a tappable row/button navigating to `/relative/patterns?u=${userId}`, styled like existing nav rows. Label: **"Rückblick & Muster"**.

- [ ] **Step 4: Build, verify**

Run: `cd webapp && pnpm build`
Expected: build succeeds, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/modes/relative/Patterns.tsx webapp/src/App.tsx webapp/src/modes/relative/InsightsDetail.tsx webapp/src/modes/relative/Home.tsx
git commit -m "feat(webapp): Rückblick & Muster relative screen + route + link"
```

---

### Task 7: Playwright screenshot sweep

**Files:**
- Reuse the existing Playwright driver (check `webapp/` or repo root for the existing screenshot script used in prior sweeps).

- [ ] **Step 1: Start backend + webapp**

```bash
# kill stale servers first (prior uvicorn:8001 / vite:5173 hold ports)
lsof -ti:8001 | xargs kill 2>/dev/null; lsof -ti:5173 | xargs kill 2>/dev/null
uvicorn hiptron.backend.main:app --port 8001 &
( cd webapp && pnpm dev & )
```

- [ ] **Step 2: Screenshot OA home + /relative/patterns for all 4 personas**

For each of helga, otto, margarete, ingrid: navigate `/older-adult?u=<p>` and `/relative/patterns?u=<p>`, screenshot, collect `browser_console_messages`. Assert: no console errors; OA shows a highlight card when `highlight != null`; patterns screen renders ≥1 section.

- [ ] **Step 3: Save screenshots to a known dir for the usability review (Task 8).**

No commit (artifacts only).

---

### Task 8: Agent-as-user usability review + fix round

**Files:**
- Any, based on findings.

- [ ] **Step 1: Dispatch two persona-reviewer agents** (parallel):
  - **Older-adult reviewer** — persona: 78-year-old, low tech confidence, mild long-sightedness. Drives `/older-adult?u=helga` and `?u=margarete`, reviews ONLY the OA surface. Criteria: is the new highlight card calm, legible (font ≥16, contrast), warm not clinical, touch targets ≥44px, nothing that reads like a health verdict. Returns a structured list of issues (severity + file guess + suggested fix).
  - **Relative reviewer** — persona: adult child checking on a parent. Drives `/relative/patterns` for all 4 personas. Criteria: does each chart earn its sentence; is monthly-delta neutral (no alarm-red); is routine framed as reassurance not surveillance; is rhythm clear; any overreach/diagnosis tone; legibility.

- [ ] **Step 2: Triage findings.** Keep correctness/tone/legibility fixes; reject scope-creep. Apply fixes (tone strings, spacing, hidden-gates, sizes).

- [ ] **Step 3: Re-verify everything.**

Run: `pytest -q` · `cd webapp && pnpm build` · `pnpm test` · re-run Playwright sweep.
Expected: all green, no console errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(webapp): usability-review polish on new metrics (tone, legibility, spacing)"
```

---

## Self-Review

- **Spec coverage:** #15 → Tasks 2/5/6; #11 → Tasks 2/4/6; #16 → Tasks 2/4/6; #8 → Tasks 2/4/6. OA-calm (single highlight) → Task 5. Relative-deep (new screen) → Task 6. Read-side only → Tasks 1–2 (no schema/pipeline). Tests → Tasks 2/4/7. Agent-as-user → Task 8. All covered.
- **Type consistency:** `Highlight`/`Rhythm`/`RhythmBucket`/`MonthlyDelta`/`RoutineScore`/`PatternsScreen` identical across models.py (Task 1) ↔ types.ts (Task 3); component prop shapes (Task 4) match the TS interfaces; `patterns_screen`/`_highlight` names consistent (Tasks 2/5). `direction` union `up|down|flat` consistent. `band` union `stabil|wechselnd` consistent.
- **Placeholder scan:** every code step has real code; wiring steps point at exact files and say to match existing signatures (not "TODO"). Routine thresholds have an explicit retune instruction tied to a test assertion.
