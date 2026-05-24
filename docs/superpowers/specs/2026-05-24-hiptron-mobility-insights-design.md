# Hiptron Mobility Insights — Design Spec

**Date:** 2026-05-24
**Status:** Brainstorm output, awaiting plan
**Scope:** Concept design for OneAIM challenge "Understanding Mobility Changes Before Emergencies Happen". Not production.

---

## Context

Hiptron is a smart sensor retrofit for rollators. Sensor stream currently available = **GPS only**. The OneAIM challenge asks: how do we use AI to detect and explain meaningful changes in everyday mobility behaviour before critical events, in a way that feels supportive rather than surveilling?

Two end users, two surfaces:
- **Older adult** (rollator user) — wants gentle motivation, light reassurance, self-respect framing.
- **Relative** — wants reassurance without surveilling. Trend-level insight when something changes, not raw tracking.

**Delivery model.** Prototype = single mobile-first webapp with two modes (Older-Adult / Relative), shared analytics backend. In v0 the mode is selected via route (`/older-adult` / `/relative`) — full auth-driven mode binding deferred (see Open Questions). PWA wrapper before final demo for installable/fullscreen feel. Native rewrite deferred to pilot phase.

Out of scope (per challenge brief and our constraints): medical diagnosis, fall/emergency detection, production-ready software, non-GPS sensors.

## Goals

1. Extract meaningful mobility patterns from GPS alone, ranked by user value.
2. Detect and explain gradual mobility change before critical events (trend-level, not alarm-level).
3. Older-adult mode: gentle daily ritual, motivation, kind tone, minimal nav, accessible to non-tech users.
4. Relative mode: reassurance-first surface, trend insight only when sustained change-point fires, never medical, no live location.
5. Privacy + emotional acceptance rank with technical accuracy. Older adult owns data; relative sees abstracted summaries.

## Non-Goals

- Real-time emergency / fall alerting.
- Medical diagnosis or risk scoring.
- Cross-user population modelling (no pilot data yet).
- Native production app build. This spec drives a prototype.

---

## Mobility Pattern Catalog

Three tiers. Tag legend: **D**aily reassurance · **T**rend / decline · **M**otivation · **S**tory.

### Tier 1 — Direct GPS signals
- **Daily distance walked** — total active mobility today. *(D · M · T)*
- **Number of outings** — trips out from home cluster. *(D · M · T)*
- **Time outdoors** — minutes away from home. *(D · M)*
- **Activity radius** — max distance reached from home. *(T · S)*
- **Walking speed** — avg + peak; slowing over weeks = signal. *(T)*
- **Pause count + dwell** — rest frequency mid-walk. *(T)*

### Tier 2 — Derived patterns
- **Within-walk fatigue** — speed delta last-third vs first-third, break density rise, walk truncation vs typical route length. Rolling 14-day window. *(T · D)*
- **Routine adherence** — same times/places day-to-day, stability score. *(D · T · S)*
- **Place repertoire** — unique destinations per week; shrinks → withdrawal. *(T · S)*
- **Favourite places** — auto-named clusters (bakery, doctor, park) via dwell clustering. *(S · M)*
- **Outdoor rhythm** — time-of-day distribution drift. *(T · S)*
- **Change-point alerts** — step-changes in distance/radius/speed/fatigue baselines. *(T)*
- **Streak / consistency** — days in a row with outdoor activity. *(M)*

### Tier 3 — Story layer (weekly / monthly)
- **Week-in-review summary** — older-adult mode: schematic SVG map (named place dots + walk lines, no real tiles in v0). Relative mode: place list + daily distance bars (no map, reinforces "not tracking" trust). *(S · M)*
- **Personal best moments** — longest walk, furthest point, new place. *(M · S)*
- **Compared-to-last-month** — trend slope vs baseline, framed positively. *(T · S)*

---

## Analytics Architecture

**Approach: per-user baseline + classical change-point detection. Template-only insights (LLM deferred).**

### Storage

Single DuckDB file `data/hiptron.duckdb` holds raw + intermediate + insights tables. No SQLite, no Parquet at v0 (Parquet export path preserved for future cloud scale). Backend opens read-only.

**Tables:**

```sql
-- raw
gps_fixes(user_id, ts, lat, lon, accuracy_m)          -- PK (user_id, ts)

-- walks
walks(walk_id PK, user_id, start_ts, end_ts, src_fix_count)
walk_features(walk_id PK, distance_m, duration_s, mean_speed,
              peak_speed, pause_count, dwell_s,
              speed_third_delta_pct, route_hash)

-- places
places(place_id PK, user_id, centroid_lat, centroid_lon,
       label, first_seen, last_seen)
walk_place_visits(walk_id, place_id, arrive_ts, depart_ts)

-- daily aggregates
daily_features(user_id, date, total_distance_m, n_outings,
               time_outdoors_min, activity_radius_m,
               fatigue_index, place_count)            -- PK (user_id, date)

-- analytics state
baselines(user_id, feature, window_end, mean, std, n)
changepoints(user_id, feature, detected_at, direction,
             score, baseline_mean, current_value)

-- output
insights(insight_id PK, user_id, audience, kind, severity,
         template_id, payload_json, created_ts, dismissed_ts)

-- runner state
pipeline_state(stage, last_processed_ts)
```

### Pipeline

```
[Synthetic GPS gen] → gps_fixes
        │
        ▼
[1. Walk segmentation]    → walks
        │
        ▼
[2. Walk features]        → walk_features
        │
        ▼
[3. Place clustering]     → places, walk_place_visits
        │
        ▼
[4. Daily aggregation]    → daily_features
        │
        ▼
[5. Baseline update]      → baselines
        │
        ▼
[6. Change-point detect]  → changepoints
        │
        ▼
[7. Insight generation]   → insights
        │
        ▼
[8. FastAPI serving]      → JSON
        │
        ▼
[9. Webapp (two modes)]   → screens
```

### Stages

0. **Synthetic GPS generator.** Scenario config (user profile, decline knobs, weeks) → rows in `gps_fixes`. Simulates home cluster + daily routine + walking speed + noise. Knobs: `distance_decline_pct_per_week`, `fatigue_onset_week`, `place_repertoire_shrink`. Replaceable with real ingest later — same table contract.

1. **Walk segmentation.** Home cluster = densest dwell point. Walk = leave home (>50 m for >5 min) → return. Stationary gap >10 min mid-walk = split.

2. **Walk features.** Haversine distance, mean/peak speed, pause count (speed <0.3 m/s), dwell, speed-third-delta (last third ÷ first third = fatigue signal), route hash for repeat-route detection.

3. **Place clustering.** DBSCAN (eps 50 m) on dwell points across all walks. Auto-label via time-of-day + day-of-week heuristic (e.g. Mon-Sat morning → "bakery"). Manual override later.

4. **Daily aggregation.** GROUP BY user_id, date over walk_features + visits. Activity radius = max distance from home that day. Fatigue index = weighted mean of per-walk speed_third_delta.

5. **Baseline update.** Rolling 4-8 week per-user mean+std per feature. Skip first 4 weeks (cold-start, collection mode only).

6. **Change-point detection.** CUSUM on distance, radius, fatigue, place_count. Sustained ≥7 days. Bayesian online change-point (BOCP) as fallback if false-positive rate too high. `ruptures` library.

7. **Insight generation.** Rule layer: detected change-point → template + audience. Two rows per change-point (older-adult gentle, relative factual). Template strings only, no LLM. Example: `"walks_shorter_trend"` → "Walks ending ~{pct}% sooner than your {window}-week baseline."

8. **Serving.** FastAPI reads DuckDB read-only. Endpoints: `/api/older-adult/home`, `/api/relative/home`, `/api/place/{id}`, `/api/week-summary`. Pydantic models → JSON.

9. **Webapp.** Single React + Vite + TypeScript app, mode toggle. Tailwind for accessibility, recharts for bars, hand-rolled SVG for schematic map (older-adult mode only). vite-plugin-pwa before final demo.

### Pipeline runner

`python -m hiptron.pipeline run --stage all|<name>`. Each stage idempotent. Watermark per stage in `pipeline_state` for incremental runs.

### Why per-user baseline over population ML

- No cold-start: each user is own reference.
- Every alert traceable to feature + threshold (explainable to coworker, judge, user).
- Cheap compute, edge-capable.
- Privacy: no shared model training.
- Trade-off: needs ~4 weeks before trend confidence; misses cross-user signals. Acceptable for MVP.

### Tech stack

| Layer | Tool | Swap path |
|---|---|---|
| Storage + compute | DuckDB | MotherDuck (cloud) → Spark/Trino |
| Intermediate format | DuckDB tables | Parquet export → Iceberg/Delta |
| Pipeline glue | Python 3.12, numpy, polars | unchanged |
| Place clustering | scikit-learn `DBSCAN` | swap algo at stage interface |
| Change-point | `ruptures` (CUSUM + BOCP) | swap algo at stage interface |
| Backend | FastAPI + uvicorn | unchanged |
| Frontend | React + Vite + TS + Tailwind | PWA → native |
| Charts | recharts | swap to visx |
| Map | hand-rolled SVG | Leaflet+OSM if schematic too toy |
| Dev | uv, ruff, mypy, pnpm, just | unchanged |

**Excluded for v0:** SQLite, Parquet, LLM, Docker, Postgres, auth.

---

## Older-Adult Mode

### Principles
- Big tap targets (44 px+), high contrast, ≥18 pt body, ≥48 pt hero numbers.
- One screen as home. No nav bar. Tap any card for detail; back gesture returns.
- Gentle tone. Never "you missed", never red, never medical.
- Self-respect framing. Personal bests > comparisons to others.
- Card text comes from templates (no LLM in v0). One short, kind sentence per card max.

### Home Screen Components
1. **Greeting + name + date** — humanise.
2. **Yesterday's walk card** — hero distance, soft subtitle with named places (not coords).
3. **Schematic map card** — SVG canvas, home in centre, named place dots, yesterday's walk line. No real tiles. Tap to expand week view.
4. **Streak card** — "X days in a row outside". Soft star, encouraging copy.
5. **Family note card** — "Anna sent a heart for your walk yesterday".
6. *(Conditional)* **Trend card** — appears only if sustained change. Phrased kindly: "you've been resting more this week — that's okay".

### Optional flows
- Tap distance card → week view with bars + story summary.
- Tap schematic map → week view: all walks overlaid, place visit counts.
- Tap favourite place → simple list of recent visits.
- Settings (relative-assisted setup) → who sees what; default = trends + summaries shared, raw routes off.

## Relative Mode

### Principles
- Reassurance-first. Status dot before any data.
- No live map. No coordinate dots. Named places only.
- Trend insight on home surface only when sustained change-point fires (≥7 days). Deeper patterns available on drill-down view.
- Never "alert", never medical language. Frame as "worth noticing".
- Older adult always controls share scope. Footer reminds: "Helga controls what you see".
- **Insight earns the chart.** Every chart answers a specific question in plain words. No charts for decoration. Headline = insight in one sentence; chart underneath supports it.
- Progressive disclosure. Home stays calm; drill-down reveals depth for relatives who want it.

### Home Screen Components
1. **Status card** — green/amber dot, last update time, one-line summary ("Routine looks normal"). One-tap **Send ♥** button. Tap → Insights detail view.
2. **Weekly trend card** — headline sentence first ("Walking distance steady this week"), 7-day bars vs 4-week average underneath.
3. *(Conditional)* **"Worth noticing" card** — amber border, plain explanation, "See details" + "Mute 7 days" actions.
4. **Footer** — privacy reminder.

### Insights Detail View (tap-through from status card)

Progressive depth for relatives who want more. Each block = one specific question + answer + minimal viz.

1. **"Is the daily routine holding?"** — routine adherence score, last 4 weeks line. One sentence verdict.
2. **"How far is Helga going?"** — distance + activity radius bars, with baseline band overlaid. Sentence verdict.
3. **"Are walks getting harder?"** — fatigue index trend (within-walk speed delta). Sentence verdict.
4. **"Where has she been?"** — named place visit counts this week vs typical (no map, just list with frequency bars).
5. **"Any change-points lately?"** — chronological list of detected shifts, plain explanation each. Empty state = "Nothing has changed enough to mention."

Each block hidden if not enough data (<4 weeks baseline). No graph appears without a sentence-level insight to justify it.

### Notification policy
- Daily silent summary only (badge or pull-to-refresh).
- Push notification only on sustained change-point fire — at most once per 7 days.
- No real-time pings.

---

## Privacy + Trust Model

- **Older adult owns data.** Defaults = trends + activity summaries shared with linked relative. Raw routes + live location **off by default**.
- **Setup is simple.** Co-onboarding flow; relative can help configure. Single big switch ("share my activity with Anna") + optional finer toggles.
- **Mute is symmetric.** Either party can mute notifications without disabling sharing.
- **Explainability.** Every trend card cites the feature + threshold ("distance down 25% vs your 4-week average").
- **Local-first option** for sensitive computation when feasible (edge feature extraction).

## Data Flow Sketch

```
[Rollator sensor] --GPS fixes-->  [Phone / ingest]
                                       |
                                       v
                          gps_fixes (DuckDB)
                                       |
                                       v
              [Pipeline stages: segment → features →
               cluster → daily → baseline → change-point →
               insights]   (all DuckDB tables)
                                       |
                                       v
                       insights table (audience-tagged)
                                       |
                                       v
                          [FastAPI backend]
                                       |
                                JSON endpoints
                                       |
                                       v
                  [Webapp — mode toggle at runtime]
                  ├─ Older-Adult mode
                  └─ Relative mode
```

---

## Prototype Scope (suggested first slice)

To prove the concept end-to-end:

1. **Synthetic GPS generator** — 8 weeks of realistic rollator-user GPS with scenario knobs (decline %, fatigue onset, place shrink). Writes to `gps_fixes` in DuckDB.
2. **Pipeline stages 1–4** — Python + DuckDB SQL: segment walks → walk features → place clustering → daily aggregation.
3. **Baseline + change-point** — stages 5–6: rolling 4–8 wk baselines, `ruptures` CUSUM on daily features. Writes `changepoints`.
4. **Insight generator** — stage 7: rule → template string per audience. Writes `insights`. No LLM.
5. **FastAPI backend** — read-only DuckDB → JSON endpoints for both modes.
6. **Single webapp, two modes** — React + Vite + TS + Tailwind. Mode toggle at runtime. Mobile-first, accessible. PWA manifest added before final demo so it installs and looks app-like.

Out of prototype: real sensor ingest, auth, account linking, production hosting, native apps, LLM polish.

---

## Verification

End-to-end test of the prototype:

1. Run synthetic generator with **no decline** → analytics produces no trend cards; both modes show normal/green.
2. Run with **distance decline starting week 5** → CUSUM fires after ~10 days; relative mode shows "worth noticing"; older-adult mode shows kind acknowledgement.
3. Run with **within-walk fatigue** injection → fatigue change-point fires; explainable text cites speed-third deltas.
4. Run with **shrinking place repertoire** → trend card fires after 2 weeks.
5. Verify accessibility: tap targets ≥44 px, contrast AA, font sizes hit targets.
6. Verify privacy defaults: relative mode never displays raw coords; only named places + counts.

---

## Critical Files / Reference Stack (proposed, may evolve)

```
hiptron/
  pipeline/
    run.py                      # CLI: python -m hiptron.pipeline run --stage all|<name>
    state.py                    # pipeline_state watermarks
    stages/
      _01_segment_walks.py
      _02_walk_features.py
      _03_cluster_places.py
      _04_daily_aggregate.py
      _05_baselines.py
      _06_changepoints.py
      _07_insights.py
    sql/                        # one .sql per stage where SQL-heavy
  synthetic/
    generator.py                # scenario knobs -> gps_fixes
    scenarios.py                # named scenarios for verification
  backend/
    main.py                     # FastAPI app
    models.py                   # Pydantic response models
    queries.py                  # DuckDB read queries
  db/
    schema.sql                  # DuckDB DDL

webapp/                         # single React app, two modes
  src/
    main.tsx
    modes/
      older-adult/              # Home, SchematicMap, WeekView
      relative/                 # Home, InsightsDetail
    shared/                     # api hooks, components, a11y utils
  vite.config.ts                # vite-plugin-pwa

data/
  hiptron.duckdb                # gitignored
docs/superpowers/specs/2026-05-24-hiptron-mobility-insights-design.md   # this spec
justfile                        # task runner: just pipeline | dev | test
pyproject.toml                  # uv-managed
```

## Open Questions (defer to plan)

- **Hosting** — local-only demo, or hosted (Vercel for webapp + Fly.io/Render for FastAPI)?
- **Branding** — match Hiptron visual identity, or neutral prototype shell?
- **DBSCAN epsilon + place label heuristic** — tune on synthetic only, or wait for real data?
- **CUSUM thresholds + window length** — default values, or per-feature tuning required?
- **Schematic map fidelity** — pure SVG abstract, or fall back to Leaflet + OSM tiles if it feels too toy?
- **Auth model** — v0: none, route-based mode (`/older-adult`, `/relative`), fixed demo user. v1 direction: super-easy device-based pairing (e.g. older-adult device claims account on first launch, relative pairs via QR / short code from older-adult's settings). No passwords. Full design deferred to post-prototype.

### Resolved

- **Synthetic GPS realism** — fully fabricated. GeoLife (Microsoft Research, ~180 young Beijing researchers, multi-modal) does not match older rollator users in walking speed, dwell, or place repertoire. Build scenario-driven generator instead.
- **LLM choice for narrative polish** — none in v0. Template strings only. LLM revisit post-prototype.
- **Delivery shape** — single mobile-first webapp, two modes (older-adult / relative), PWA wrapper before final demo, native deferred to pilot.
- **Data substrate** — DuckDB single-file for raw + intermediate + insights. SQLite/Parquet not needed at v0.
