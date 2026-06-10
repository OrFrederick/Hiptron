# Gait Metrics: Tempo, Pausen, Walk-Fade — Design

**Date:** 2026-06-10
**Status:** Approved (user: "build")
**Completes:** the last 3 Mobility Pattern Catalog metrics (walking speed, pause count + dwell, within-walk fatigue) from `2026-05-24-hiptron-mobility-insights-design.md`.

## Context & framing decision

These three were previously excluded as "gait-decline diagnostics" under the not-medical-device rule. On 2026-06-10 the user clarified the rule: Hiptron *is* health-related; "not a medical device" means no certification and no goal of fully diagnosing anyone. Physiological trends may be shown properly — real numbers, real trends, including declines — but worded as **observations, never diagnoses**. No "Ermüdung", "Sturzrisiko", "Abbau", risk scores, or clinical claims. Declines framed gently ("etwas langsamer unterwegs", "macht öfter kurz Halt").

## Scope decisions (user-approved)

1. **Generator + reseed** — not read-side-only. Current synthetic data is flat (constant 15s fix interval → identical speeds, zero mid-walk pauses, ~zero `speed_third_delta_pct`). Trends must be visible to be worth showing.
2. **Persona mapping:** helga = speed decline + within-walk fade (deepens her existing distance-decline story); margarete = more mid-walk pauses (rests more when out); otto + ingrid stable on all three.
3. **Placement:** relative-mode Patterns screen (`Rückblick & Muster`) only. OA app unchanged ("OA gains exactly ONE thing" rule stands; older adult never sees own gait decline).
4. **Display style:** real numbers + trends (weekly km/h line, pause counts, % slower in last third), observation wording around them.

## What already exists (no pipeline changes needed)

Stage 2 (`hiptron/pipeline/stages/_02_walk_features.py`) already computes per-walk: `mean_speed`, `peak_speed`, `pause_count` (speed dips < 0.3 m/s), `dwell_s`, `speed_third_delta_pct` (last-third vs first-third speed, %). Stage 4 already aggregates daily `fatigue_index` (avg non-zero third-delta). `TRACKED_FEATURES` (stages 5/6) **stays unchanged** — no new baselines, changepoints, or insights, so each persona's existing amber story stays unique and the caregiver-home logic is untouched.

## Generator changes (`hiptron/synthetic/scenarios.py`, `generator.py`)

New `Scenario` fields (all default to "no signal"):

| Field | helga | otto | margarete | ingrid |
|---|---|---|---|---|
| `walk_speed_mps` (base) | 1.15 | 1.1 | 1.0 | 1.25 |
| `speed_decline_pct_per_week` / onset week | 2.5 / wk 6 | — | — | — |
| within-walk fade (last third slower, post-onset) | ~20% | — | — | — |
| `pauses_per_walk` (range) / dwell each | — | — | 2–4 / 20–90 s | — |

Mechanics:

- **Speed realization:** vary per-fix step *distance* (step interval stays `TRANSIT_STEP_S = 15`); effective speed = `walk_speed_mps × week_factor × segment_factor`. Helga's `week_factor` declines 2.5%/week from week 6 (≈ −15% by `DEMO_END`), aligned with her distance-decline onset so it reads as one coherent story.
- **Within-walk fade (helga, post-onset):** fixes in the last third of the route emitted ~20% slower → genuinely negative `speed_third_delta_pct`. This replaces the dormant `fatigue_onset_week` hook (`generator.py:243`), which slowed the whole walk uniformly and therefore never moved the third-delta (the old "symmetric signal" bug). Remove or repurpose that dead hook.
- **Mid-walk pauses (margarete):** 2–4 stationary holds per outing at random points along the route, dwell 20–90 s each. **Hard constraint: dwell < 120 s** — stage-3 DBSCAN clusters dwells ≥ 120 s within 10 m into `places`; longer pauses would mint fake destinations. Pauses start with her outing-drop onset.
- **RNG discipline:** all new randomness from a **separate seeded `random.Random` stream** (e.g. seeded `f"{seed}-gait"`), so the existing draw sequence (routes, distances, place visits) is bit-identical to today. Otherwise changepoint timing drifts and the 14-day amber window can silently break. `Scenario.end_dt` stays pinned to `DEMO_END`.
- **Post-reseed invariant check:** helga/otto/margarete amber, ingrid green on caregiver home.

Side effects accepted: margarete's pause dwell adds ~2–6 min to her walk durations → slightly higher `time_outdoors_min`; helga's fade slightly lengthens her walks. Both small and story-consistent.

## Backend (read-side, `hiptron/backend/queries.py` + `models.py`)

Three new query helpers, same conventions as `_time_outdoors()` (28d vs prior-28d, flat threshold 10%, hidden gate < 8 active days in window):

- `_walking_speed()` → `WalkingSpeed`: weekly avg of `walk_features.mean_speed` (km/h, 1 decimal) for the last ~12 weeks (for the trend line) + current-28d avg, prior-28d avg, direction (`up`/`down`/`flat`).
- `_pause_stats()` → `PauseStats`: 28d avg `pause_count` per walk (1 decimal) + avg dwell minutes per walk, prior-28d comparison, direction.
- `_walk_fade()` → `WalkFade`: 28d avg `speed_third_delta_pct` (negative = slower at end), prior-28d, direction. Internal/API naming is `walk_fade` — "fatigue" never appears in API fields or UI.

All wired into `patterns_screen()` → `PatternsScreen` model. Walks joined via `walks.start_ts` for windowing (same as existing helpers).

## Frontend (relative mode only)

`webapp/src/shared/types.ts` mirrors the new models. `webapp/src/shared/charts.tsx` gains:

- `SpeedTrendLine` — weekly km/h line/area chart, ~12 weeks, visible y-axis with same tick/axis conventions as `WeekBars`/`niceAxisMax`.
- Pause + fade blocks reuse existing primitives where possible (`DeltaRow`-style comparison rows); new tiny primitives only if needed.

`webapp/src/modes/relative/Patterns.tsx` gains three blocks, placed **after "Zeit draußen", before the monthly-deltas section** (so the existing "Zahlen können schwanken" framing line still precedes all delta rows):

1. **Tempo** — `SpeedTrendLine` + headline, e.g. "Etwas langsamer unterwegs als im Frühjahr — zuletzt ca. 3,7 km/h".
2. **Pausen unterwegs** — "Macht unterwegs öfter kurz Halt: im Schnitt 3 Pausen pro Spaziergang (zusammen ca. 2 Min)".
3. **Innerhalb eines Spaziergangs** — "Gegen Ende eines Spaziergangs etwas gemächlicher: das letzte Drittel ist ca. 18 % langsamer".

Wording rules: observation sentences, gentle decline framing, no diagnosis vocabulary, stable personas read "wie immer"/"stabil". Hidden blocks (insufficient data) render nothing rather than empty shells.

## Static demo

After reseed + pipeline: re-run `scripts/bake_static_api.py` (relative/patterns for all 4 personas; other baked endpoints re-bake too since underlying data changes — distances/durations shift slightly for helga/margarete).

## Testing

- **Generator/pipeline (pytest):** post-seed asserts — helga `speed_third_delta_pct` meaningfully negative after onset & weekly `mean_speed` declining; margarete `pause_count > 0` and **no new `places` rows vs today's count**; ingrid/otto flat on all three; amber/green invariant per persona.
- **Backend (pytest, `tests/test_patterns.py`):** new fields present, directions correct per persona, hidden-gate behavior.
- **Frontend (vitest):** `SpeedTrendLine` + new blocks render/hide correctly.
- Full gates: pytest, vitest, eslint, build, ruff, mypy clean.

## Non-goals

- No OA-mode surface for these metrics.
- No new changepoints/insights/baselines (`TRACKED_FEATURES` unchanged).
- No peak-speed display (computed but not surfaced — no warm story).
- No schema changes (all columns exist).
