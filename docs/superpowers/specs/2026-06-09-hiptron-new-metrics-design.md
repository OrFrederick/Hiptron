# Hiptron New-Metrics Build — Design Spec

**Date:** 2026-06-09
**Status:** Approved (user delegated decisions), awaiting plan
**Scope:** Add 4 of the planned-but-unbuilt Mobility Pattern Catalog metrics to the demo. Extends `2026-06-06-hiptron-jury-demo-build-design.md` and the original catalog in `2026-05-24-hiptron-mobility-insights-design.md`. Not production.

---

## Context

The webapp currently visualizes 8 of the 16 planned catalog metrics (distance, outings, radius, place-repertoire, favourite places, change-points, streak, week-in-review). Of the rest, three are deliberately excluded as gait-decline diagnostics (walking speed #5, pause/dwell #6, within-walk fatigue #7 — already retired) and stay out per the **not-a-medical-device** identity. This build adds the four that are warm, story-level, and non-diagnostic:

- **#15 Personal-best moments** — longest walk, furthest point, new place discovered.
- **#11 Outdoor rhythm** — time-of-day distribution of outings.
- **#16 Compared-to-last-month** — this-period vs prior-period trend per tracked feature.
- **#8 Routine adherence** — start-time + place-set consistency, framed as reassurance.

**Key feasibility finding (code-checked):** all four are **pure read-side**. Every column needed already exists — `walks.start_ts`, `walk_features.distance_m`, `daily_features.activity_radius_m`/`total_distance_m`/`n_outings`/`place_count`, `places.first_seen`. **No schema change, no new `TRACKED_FEATURES`, no pipeline/changepoint change, no DB reseed.** This keeps the build low-risk and demo-safe (no ~3-min rebuild per change).

## Product identity (non-negotiable)

Hiptron is **not a medical device and does not diagnose.** Every new string is a gentle observation of an everyday pattern, never a health claim, score-of-decline, or alarm. Older-adult tone = kind/reassuring/minimal. Relative tone = factual/trend-level. Speed/pause/fatigue stay OUT.

## Placement principle — OA calm, relative deep

The older-adult surface stays calm: it gains exactly **one** new thing, a warm "Höhepunkt" highlight card. All analytic depth lives in the relative mode's new screen.

| Metric | Older-adult | Relative |
|---|---|---|
| #15 Personal-best | ✅ one warm "Höhepunkt" card (rotating: longest walk / furthest / new place) | Höhepunkte strip in new screen |
| #11 Outdoor rhythm | ✗ | 3-bucket bar (Vormittags/Nachmittags/Abends) + sentence |
| #16 vs-last-month | ✗ | signed delta row per tracked feature (▲▼ %) |
| #8 Routine adherence | ✗ | calm "Rhythmus" consistency bar + reassurance sentence (not a clinical dial) |

## Metric computations (all read-side in `queries.py`)

Let `max_date = MAX(daily_features.date)` for the user. Windows are anchored to `max_date` so demo dates read live.

**#15 Personal-best (window = last 7 days):**
- Longest walk: `walk_features.distance_m` max over walks with `start_ts >= max_date-7d`, carry `start_ts` + place_labels.
- Furthest: `MAX(activity_radius_m)` over window, carry its `date`.
- New place: `places.first_seen >= max_date-7d`, most recent, carry `label`.
- OA card picks ONE by priority: new place > longest-walk (if ≥ its 4-wk typical) > furthest. Gentle prebuilt sentence + small detail line. Relative strip lists all available.

**#11 Outdoor rhythm (window = last 28 days):**
- `EXTRACT(HOUR FROM walks.start_ts)` bucketed: morning `<12`, afternoon `12–17`, evening `≥18`. Shares sum to 1. Sentence names the dominant bucket ("Meist vormittags unterwegs."). Hidden if < ~8 outings in window.

**#16 Compared-to-last-month (computed directly from `daily_features`):**
- this = `AVG(feature)` over `[max_date-28d, max_date]`; prior = `AVG(feature)` over `[max_date-56d, max_date-28d]`. Per feature in the 4 tracked. `pct_delta = (this-prior)/prior*100`, signed; `direction = up|down|flat` (|delta| < 5% → flat). Friendly labels (Gehstrecke, Aktionsradius, Ausgänge, Orte). Neutral coloring, never alarm-red.

**#8 Routine adherence (window = last 28 days):**
- start-time consistency: `STDDEV_POP(EXTRACT(HOUR FROM start_ts))` over outings → lower = steadier.
- regular-place ratio: share of visits going to places visited ≥3× in window.
- Combine into `score` 0–100 (start-time stddev is primary, regular-place ratio secondary), `band = stabil` (≥60) | `wechselnd` (<60), reassurance sentence. Hidden if < ~10 outings. Framed positive — "wechselnd" reads as variety, never as a problem.

## Data contract (new/changed Pydantic models, `models.py`)

```python
class Highlight(BaseModel):
    kind: Literal["longest_walk", "furthest", "new_place"]
    text: str             # gentle sentence
    detail: str | None    # e.g. "2,3 km · Dienstag"

# OlderAdultHome gains: highlight: Highlight | None

class RhythmBucket(BaseModel):
    label: str            # "Vormittags" | "Nachmittags" | "Abends"
    share: float          # 0..1

class Rhythm(BaseModel):
    buckets: list[RhythmBucket]
    sentence: str

class MonthlyDelta(BaseModel):
    feature: str
    label: str            # friendly
    this_value: float
    prior_value: float
    pct_delta: float      # signed
    direction: Literal["up", "down", "flat"]

class RoutineScore(BaseModel):
    score: int            # 0..100
    band: Literal["stabil", "wechselnd"]
    sentence: str

class PatternsScreen(BaseModel):
    user_id: str
    highlights: list[Highlight]
    rhythm: Rhythm | None
    monthly_deltas: list[MonthlyDelta]
    routine: RoutineScore | None
```

**Endpoint:** `GET /api/relative/patterns?user_id=` → `PatternsScreen` (new query fn `patterns_screen(db_path, user_id)`). `older_adult_home` gains the `highlight` field via a new `_highlight(con, user_id)` helper.

## Frontend

- **New chart primitives** in `shared/charts.tsx` (match the calm navy/white/green system, sentence-first): `RhythmBars` (3 horizontal share bars), `DeltaRow` (label · ▲▼ · signed %), `RoutineBar` (labelled consistency bar). Reuse `HIP.c`, no new colors except a neutral up/down tint.
- **OA Home** (`modes/older-adult/Home.tsx`): one `HighlightCard` (reuse `Card`/`kit`), placed after the yesterday-walk hero, hidden when `highlight == null`.
- **New relative screen** `modes/relative/Patterns.tsx`, route `/relative/patterns`, titled **"Rückblick & Muster"**. Sections: Höhepunkte → Rhythmus → Verglichen mit letztem Monat → Rhythmus-Stabilität. Linked from relative Home and from `InsightsDetail`. Each block hidden when its data is null/empty (insight-earns-the-chart rule).
- `shared/api.ts` `fetchPatterns(userId)`; `shared/types.ts` matching types; `App.tsx` route; relative `Shell` nav entry if one fits, else an in-page link.

## Testing

- **Backend pytest** (`tests/`): per query fn against the four seeded personas. Asserts: rhythm shares sum≈1 + dominant bucket sentence; monthly-delta sign (margarete `n_outings` down, helga `total_distance_m` down, ingrid all ~flat); routine score in [0,100] and ingrid (steady) → `stabil`; highlight selection priority; all hidden-gates fire on thin windows. Cross-user isolation reused.
- **Frontend vitest**: `RhythmBars`/`DeltaRow`/`RoutineBar`/`HighlightCard` render; touch-target ≥44px on OA card; no NaN/empty-array crashes.
- **Playwright sweep**: screenshot OA home (highlight) + `/relative/patterns` for all 4 personas; assert no console errors and each present block renders.
- **Agent-as-user usability pass**: an older-adult-persona agent and a relative-persona agent drive the running app via Playwright, screenshot every affected screen, and critique against: calm/clarity for OA, overreach/diagnosis tone, legibility, touch targets, "does the chart earn its sentence". Findings feed a fix round before completion.

## Build order (each independently shippable, subagent-driven)

1. **Backend**: 4 query fns + models + endpoint + `older_adult_home.highlight`; pytest green.
2. **Frontend primitives**: `RhythmBars`/`DeltaRow`/`RoutineBar` + vitest.
3. **OA highlight**: `HighlightCard` wired into OA Home.
4. **Relative Patterns screen**: screen + route + links + api/types.
5. **Playwright screenshot sweep** across personas.
6. **Agent-as-user usability review** (2 persona agents) → findings.
7. **Fix round** from findings; re-verify lint/build/vitest/pytest/Playwright.

## Non-goals / guardrails

- No speed/pause/fatigue surfacing (gait-decline diagnostics).
- No schema migration, no `TRACKED_FEATURES` change, no reseed.
- No alarm framing — "wechselnd"/down-deltas read as neutral everyday variation.
- No new OA detail beyond the single highlight card (OA stays calm).

## Risks / open items

- Routine score is heuristic; tune thresholds on the seeded personas so ingrid reads `stabil` and no persona reads alarming. Pure read-side → cheap to retune.
- `baselines`-free monthly delta (direct `daily_features` averages) needs ≥ ~8 weeks history; personas have 10–12, so fine. Hidden-gate covers thin data.
