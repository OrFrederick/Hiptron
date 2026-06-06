# Hiptron Jury-Demo Build — Design Spec

**Date:** 2026-06-06
**Status:** Brainstorm output, awaiting plan
**Scope:** Make the `v0-functional-prototype` demo-solid for a live OneAIM jury — multiple switchable personas, denser synthetic data, a robust schematic map, and a fact-checked set of new insights. Extends `2026-05-24-hiptron-mobility-insights-design.md`. Not production.

---

## Context

The prototype currently runs one synthetic user (`helga`) through the full GPS → DuckDB → FastAPI → React chain. A live jury needs to flip between believable people, see populated charts/maps, and trust that every number is defensible. Three advisory passes (clinical, caregiver-UX, data-feasibility) plus a code-verified critique produced the insight catalog below.

**Product identity (non-negotiable framing).** Hiptron is **not a medical device and does not diagnose.** Every insight is a *gentle observation of an everyday walking pattern*, never a health claim, risk score, or alarm. Older-adult tone = kind/reassuring. Relative tone = factual/trend-level, never raw coordinates, never a map, never live location, never naming *who* was visited.

## Goals

1. Four switchable personas, each with one clearly-firing signature pattern, plus a healthy control.
2. Denser, more varied synthetic data so maps and charts read "real" on stage.
3. A schematic map robust to sparse/dense data — no clipping, no label collisions, all named places shown.
4. A small, fact-checked set of new insights that strengthen the demo without overreach.
5. Fix two verified correctness land mines (fake radius, dead fatigue scenario) before they reach a jury.

## Non-Goals

- Medical diagnosis, risk scoring, fall/emergency detection, "fatigue/decline" health language.
- Production auth, multi-tenant deployment, real GPS ingestion.
- Insights that are GPS-weak or trust-eroding (see AVOID list).

---

## Verified findings (code-checked)

| Finding | Location | Action |
|---|---|---|
| `activity_radius_m` = `MAX(distance_m / 2)` — half the longest path, **not** distance from home | `_04_daily_aggregate.py:15` | **Must-fix** → real home-anchored max distance |
| Fatigue scenario is a no-op — uniform `*= 0.9` + symmetric speed profile → `speed_third_delta_pct ≈ 0` | `generator.py` (~:111–118) | Drop fatigue as a signal; re-base margarete on outing-frequency |
| `n_outings`, `time_outdoors_min` computed but **not tracked** | `schema.sql:57-58`, `_04:13-14` | Cheap: add `n_outings` to `TRACKED_FEATURES` |
| `places.first_seen` / `last_seen` populated | `schema.sql:40-41`, `_03:76-77` | Enables new-place card (read-side) |
| `TRACKED_FEATURES` = 4 (`total_distance_m, activity_radius_m, fatigue_index, place_count`) | `_05_baselines.py:10-15`, `_06_changepoints.py:10-15` | Add `n_outings`; keep `activity_radius_m` (now real) |
| All scenarios hardcode `user_id="helga"` | `scenarios.py` | Give 4 distinct `user_id`s |
| Real column is `speed_third_delta_pct` (not `…_delta`) | `schema.sql:22-30` | Naming note for implementers |

---

## Personas

Four distinct `user_id`s, each ~10–12 weeks ending today (so dates read live). Each maps to one signature pattern that visibly fires.

| `user_id` | Display | Story (pattern, not diagnosis) | Signature insight | Generator knob |
|---|---|---|---|---|
| `helga` | Helga | gradually shorter walks | distance decline | `distance_decline` wk4 (exists) |
| `otto` | Otto | visiting fewer different places | place repertoire down | `place_repertoire_shrink` (exists) |
| `margarete` | Margarete | getting out less often | outing-frequency drop | **new:** taper `outings_per_day` over weeks |
| `ingrid` | Ingrid | steady, all-clear | steady-rhythm reassurance | **new:** healthy scenario, no decline knobs |

All four seeded into one `data/hiptron.duckdb`; the pipeline already iterates every `user_id`.

## Insight catalog

**SHIP (build for demo):**
1. **Steady-rhythm "all-clear"** — when no active changepoint fires in the window, render a reassurance verdict instead of silence. Read-side. OA: *"Schöne, gleichmäßige Woche."* Relative: *"Diese Woche wie gewohnt — Strecke, Orte und Tempo im normalen Bereich."* Powers ingrid and the ~90% of normal weeks; the anti-surveillance story.
2. **Distance decline** — `total_distance_m` CUSUM (already wired). helga.
3. **Life-space radius (REAL)** — rewrite `_04` to `MAX(haversine(fix, home))` per day; `home` from existing stage-01 estimate. Track in baselines + changepoints. OA: *"Näher zu Hause unterwegs."* Relative: *"Aktionsradius ~{pct}% kleiner als der 4-Wochen-Mittelwert."*
4. **Place repertoire down** — `place_count` CUSUM (already wired). otto.
5. **New place discovered** — `places.first_seen` within window. Read-side, positive note. OA: *"Neuer Ort entdeckt."* Relative: *"Hat diese Woche einen neuen Ort besucht."*
6. **Outing-frequency drop** — add `n_outings` to `TRACKED_FEATURES` + templates. margarete. OA: *"Etwas weniger draußen diese Woche."* Relative: *"Geht aktuell ~{pct}% seltener raus als gewohnt."*

**AVOID (v1):** fatigue/effort (dead signal + edges toward health claim), rest-stop frequency, route entropy, time-outdoors (redundant), abandoned-place ("no friends" tone risk), day-variability, nocturnal outings, gait/cadence, fall detection. Rationale: GPS-weak, noisy, or diagnostic-sounding.

## Architecture changes

Each insight flows the same seam: `daily_features` → `baselines` → `changepoints` → `_07_insights` → backend query/model → frontend block. Specifics:

- **Stage 4 (`_04_daily_aggregate.py`):** replace fake radius with home-anchored haversine max. No new column name change needed (`activity_radius_m` keeps its name, gains real meaning).
- **Stages 5 & 6:** add `n_outings` to `TRACKED_FEATURES` (both files must match).
- **Stage 7 (`_07_insights.py`):** `activity_radius_m` templates already exist (keep — now backed by real data); add template pairs for `n_outings`, plus the read-side "all-clear" + "new-place" notes. Confirm direction/threshold per feature.
- **Backend:** `queries.py` gains the all-clear fallback + new-place read; `models.py` + `types.ts` gain any new block/card fields. Endpoints already take `user_id` — no change.
- **Frontend:** new insight block(s) in `modes/relative/insights/`; new-place + all-clear surfaced; older-adult home gets the gentle equivalents.

## Persona switching (UX)

In-app dropdown switcher (per user decision). A compact persona selector in a header, available on every screen. `userId` lives in app state (URL param `?u=helga` so refresh/deep-link survive a demo). Replace hardcoded `DEFAULT_USER = "helga"` in `shared/api.ts`; thread `userId` through the three query hooks. Keep the older-adult surface calm — switcher styled minimally, not a clinical control panel.

## Map robustness

`SchematicMap.tsx` + the place-labeling path:
- Extend `LABEL_DE` / `LABEL_COLOR` for new place types (Apotheke, Kirche, Café).
- Clamp every projected point inside `PADDING` so the polyline can't touch/overflow the rounded grid border.
- Label-collision avoidance: smarter offset than alternating ±14/22 when markers are close.
- Degrade gracefully: 0–1 place, empty/one-point polyline, all-same-label cases must not break layout.
- Verify the place-labeling source actually yields named labels for every persona (richer data feeds more markers).

## Richer synthetic data

- Expand `DEFAULT_PLACES` 5 → ~8 (add Apotheke, Kirche, Café) with realistic offsets/visit-probabilities/schedules.
- Per-persona place subsets so each map looks distinct.
- Vary outing distance and weekend pattern; 10–12 week history so baselines + charts are full.
- New generator knob: taper `outings_per_day` over weeks (for margarete) — distinct from the existing distance-only `_decline_factor`.

## Testing

- Extend `tests/test_e2e_scenarios.py`: one test per persona asserting its signature insight fires; one cross-user isolation test (helga's changepoint never appears for ingrid); one asserting ingrid yields the all-clear (no decline changepoint).
- Add a unit check that real `activity_radius_m` ≈ home-distance, not path/2 (guard against regressing the must-fix).
- Frontend: reuse the existing Playwright driver — screenshot every persona × every screen; assert no console errors and that the map renders ≥1 place marker.

## Build order (each independently shippable)

1. **Must-fix correctness:** real life-space radius (stage 4 + tracked feature + template).
2. **Personas:** 4 distinct `user_id`s, ingrid healthy scenario, margarete `outings_per_day` taper, per-persona place subsets; reseed + run pipeline.
3. **New insights:** outing-frequency (track `n_outings`), all-clear reassurance (read-side), new-place card (read-side) — through to frontend blocks.
4. **Map robustness:** clamping, collisions, new place colors, sparse/dense edge cases.
5. **Frontend switcher:** persona dropdown + `userId` threading + `?u=` param.
6. **Tests + screenshot sweep.**

## Risks / open items

- DB rebuild ~3 min; reseed all four personas + full pipeline run is part of every data-shape change.
- Demo surface area: keep the SHIP-list tight; STRETCH items (abandoned-place, time-outdoors) only if time permits.
- Tone audit: every new template string must pass the "observation, not diagnosis" test before merge.
