# Hiptron Remaining Pages — Navy/White/Green Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reskin the four remaining Hiptron pages (Mode chooser, Senior Week View, Relative Insights Detail, loading/error states) into the existing navy/white/green iOS system, wired to real data.

**Architecture:** The navy/white/green kit already exists (`shared/theme.ts`, `kit.tsx`, `Icon.tsx`, `Shell.tsx`, `labels.ts`). The two Home screens are already reskinned. The four target pages still use the old warm-cream `shared/Card.tsx` + Tailwind warm classes. This plan restyles them using the existing kit, adds a few new primitives the bundle genuinely introduces (NavyLabel, BackButtonBig, SlimNavyHeader, InsightBlock, WeekBars, PlaceBars, LoadingState, ErrorState), and makes two additive backend changes so real data feeds the senior week + places.

**Tech Stack:** React + TS + Tailwind + react-router + recharts + @tanstack/react-query (frontend); FastAPI + Pydantic + DuckDB (backend); vitest + pytest.

**Design source:** bundle at `/tmp/hb/hiptron/project/screens2c.jsx` + `charts2.jsx` (the approved navy reskin). recharts for relative-insights charts (bars `#1F5FE0`, baseline `#6B7686`, per WeeklyTrendCard); ported `WeekBars`/`PlaceBars` for the senior week (exact approved senior look, big type).

**Hard constraints:** German copy only. Not a medical device — never Risiko/Diagnose/Vitalwerte/Alarm/Sturz. Charts subordinate to sentences. Senior pages body ≥18px, touch ≥56px. Max-width 420px single column. Relative approximate map is an accepted decision — don't re-flag.

---

## Key decisions (locked)

1. **Senior WeekView reads the senior endpoint** (`useOlderAdultHome`), not the relative-insights hack it uses today. Needs a weekly distance series + per-place counts in `OlderAdultHome`.
2. **Backend additions (additive, defaulted — no breaking change):**
   - `Place.visits: int = 0` — populate from the count already computed-then-discarded in `_top_places`.
   - `OlderAdultHome.week_distances: WeeklyTrend | None = None` — last-7-day daily `total_distance_m` + baseline, via a shared `_weekly_distance()` helper reused by `relative_home`.
   - `insights_detail` place_count block emits per-place `series=[{label,count}]` (verdict still computed from the daily series). Aligns backend with the *existing* `InsightsDetail.test.tsx` fake and the bundle's place-list design.
3. **Relative insights charts = recharts** styled blue `#1F5FE0` / baseline `#6B7686` (consistent w/ WeeklyTrendCard already on relative home). **Senior week charts = ported WeekBars/PlaceBars** (no recharts; big senior type, dashed "üblich" legend).
4. **Loading/error centralised** in `shared/states.tsx` (`LoadingState`, `ErrorState`, `SkeletonHome`); both Home screens drop their duplicated `FullScreenMessage` and use it. Keyframes `hipPulse`/`hipShimmer` added to `index.css`.
5. New primitives live in `kit.tsx` (`NavyLabel`, `BackButtonBig`, `SlimNavyHeader`, `InsightBlock`) and `charts.tsx` (`WeekBars`, `PlaceBars`).

## File structure

- Create: `webapp/src/shared/charts.tsx` (WeekBars, PlaceBars)
- Create: `webapp/src/shared/states.tsx` (LoadingState, ErrorState, SkeletonHome)
- Create: `webapp/tests/older-adult/WeekView.test.tsx`, `webapp/tests/ModeChooser.test.tsx`
- Modify: `hiptron/backend/models.py` (Place.visits, OlderAdultHome.week_distances)
- Modify: `hiptron/backend/queries.py` (_weekly_distance helper, populate visits + week_distances, per-place insight series)
- Modify: `webapp/src/shared/types.ts` (Place.visits, OlderAdultHome.week_distances)
- Modify: `webapp/src/shared/kit.tsx` (NavyLabel, BackButtonBig, SlimNavyHeader, InsightBlock)
- Modify: `webapp/src/index.css` (keyframes)
- Modify: `webapp/src/App.tsx` (ModeChooser reskin)
- Modify: `webapp/src/modes/older-adult/WeekView.tsx` (full rebuild)
- Modify: `webapp/src/modes/relative/InsightsDetail.tsx` (Shell + SlimNavyHeader + footer + states)
- Modify: the 5 `modes/relative/insights/*Block.tsx` (InsightBlock wrapper + blue charts + ChangeList empty state)
- Modify: `webapp/src/modes/older-adult/Home.tsx`, `modes/relative/Home.tsx` (use shared states)
- Test: `tests/test_backend.py` (assert week_distances + place visits)

---

## Task 1: Backend — weekly distance + place visits + per-place insight series

**Files:** Modify `hiptron/backend/models.py`, `hiptron/backend/queries.py`; Test `tests/test_backend.py`.

- [ ] **Step 1:** Add fields. `models.py`: `Place.visits: int = 0`; on `OlderAdultHome` add `week_distances: WeeklyTrend | None = None`.
- [ ] **Step 2:** `queries.py` — extract helper from `relative_home`'s weekly block:
```python
def _weekly_distance(con, user_id) -> WeeklyTrend:
    ref = con.execute("SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)).fetchone()
    ref_date = ref[0] if ref and ref[0] else dt.date.today()
    points = con.execute(
        "SELECT date, total_distance_m FROM daily_features WHERE user_id = ? AND date >= ? - INTERVAL 7 DAY ORDER BY date",
        (user_id, ref_date)).fetchall()
    base = con.execute(
        "SELECT mean FROM baselines WHERE user_id = ? AND feature = 'total_distance_m' ORDER BY window_end DESC LIMIT 1",
        (user_id,)).fetchone()
    base_mean = float(base[0]) if base else 0.0
    return WeeklyTrend(headline=_trend_headline(points, base_mean),
                       points=[WeeklyTrendPoint(date=d, value=v or 0.0) for d, v in points],
                       baseline_mean=base_mean)
```
   Use it in `relative_home` (replace inline `weekly`) and pass `week_distances=_weekly_distance(con, user_id)` in `older_adult_home`'s return.
- [ ] **Step 3:** Populate `visits` in `_top_places`: `Place(..., visits=int(_visits or 0))`.
- [ ] **Step 4:** In `insights_detail`, for the `place_count` block, after computing `verdict` from the daily series, replace its `series` with per-place counts:
```python
if feature == "place_count":
    pv = con.execute(
        "SELECT p.label, count(*) c FROM walk_place_visits v "
        "JOIN places p ON p.place_id = v.place_id "
        "JOIN walks w ON w.walk_id = v.walk_id "
        "WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 28 DAY "
        "GROUP BY p.label ORDER BY c DESC LIMIT 6", (user_id, ref_date)).fetchall()
    series = [{"label": lbl, "count": int(c)} for lbl, c in pv]
else:
    series = [{"date": str(d), "value": v or 0.0, "baseline": baseline_mean} for d, v in series_rows]
```
- [ ] **Step 5:** Tests in `tests/test_backend.py`: assert `older-adult/home` body has `week_distances` with `points`; assert `relative/insights` place block series items have `label`/`count`. Run `uv run pytest tests/test_backend.py -q` → PASS. Then full `uv run pytest -q`.
- [ ] **Step 6:** Commit.

## Task 2: Shared states + keyframes

**Files:** Create `webapp/src/shared/states.tsx`; Modify `index.css`, both `Home.tsx`.

- [ ] **Step 1:** `index.css` — append keyframes:
```css
@keyframes hipPulse { 0%,100%{opacity:.25;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
@keyframes hipShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
```
- [ ] **Step 2:** `states.tsx` — port `LoadingState` (pulsing 3 dots + text, default "Lade deinen Tag…"), `ErrorState` (calm bulb circle, "Etwas ist still geworden.", "Bitte später erneut versuchen.", optional retry), `SkeletonHome` from bundle `screens2c.jsx`, using `HIP`/`Ic`/`Shell`/`Card`. Loading & error wrap in a centred `appBg` full-height container (match existing `FullScreenMessage`).
- [ ] **Step 3:** Both Home screens: delete local `FullScreenMessage`, import `LoadingState`/`ErrorState`; older-adult loading→`<LoadingState />`, error→`<ErrorState />`; relative loading→`<LoadingState text="Lädt…" />`, error→`<ErrorState />`. Keep existing Home tests green (they mock resolved fetch, so states don't render).
- [ ] **Step 4:** `pnpm test`, `pnpm lint`. Commit.

## Task 3: Shared primitives — kit + charts

**Files:** Modify `kit.tsx`; Create `charts.tsx`.

- [ ] **Step 1:** `kit.tsx` add (port from `screens2c.jsx`): `NavyLabel` (uppercase tracked navy700), `BackButtonBig` (≥56px pill, chevron flipped, onBack), `SlimNavyHeader` (navy gradient, round back btn, title), `InsightBlock` ({q, verdict, children} → uppercase muted question, medium verdict, viz).
- [ ] **Step 2:** `charts.tsx` (port from `charts2.jsx`, typed): `WeekBars({data:number[],days:string[],baseline,baselineLabel,big})`, `PlaceBars({places:{label,count}[],big})`. Colors from `HIP.c.blue600`/`chip`/`textMuted`.
- [ ] **Step 3:** `pnpm lint` (no unused). Commit.

## Task 4: Mode chooser (App.tsx)

**Files:** Modify `App.tsx`; Test `webapp/tests/ModeChooser.test.tsx`.

- [ ] **Step 1:** Test: render `<App>` at `/` in `MemoryRouter`; expect "Hiptron", "Senior-Modus", "Angehörigen-Modus", and a persona control. (Wrap with QueryClient if needed — ModeChooser itself needs none.)
- [ ] **Step 2:** Rebuild `ModeChooser` per bundle: centred navy rounded logo tile w/ `walk` icon + amber sun dots, "Hiptron" 36/700, tagline "Ein ruhiges Auge auf den Alltag — in Verbindung, ohne Überwachung.", two stacked `ModeButton`s (filled navy `Senior-Modus`/"Für mich selbst" → `/older-adult?u=`, outline `Angehörigen-Modus`/"Für jemanden, den ich begleite" → `/relative?u=`), and the demo persona row using existing `PersonaSwitcher`. Keep `usePersona()` + `?u=` routing. Use `Link` for nav (keep router semantics).
- [ ] **Step 3:** `pnpm test`, `pnpm lint`, `tsc`. Commit.

## Task 5: Senior Week View

**Files:** Modify `WeekView.tsx`; Test `webapp/tests/older-adult/WeekView.test.tsx`.

- [ ] **Step 1:** Test: mock fetch → fake `OlderAdultHome` with `week_distances.points` (7) + `schematic_map.places` (w/ `visits`). Expect "Meine Woche", "Deine Woche", the sentence "Jeder Balken ist ein Tag — wie weit du unterwegs warst.", and a place label (e.g. "Bäckerei").
- [ ] **Step 2:** Rebuild using `useOlderAdultHome(userId)`: `Shell active="statistik"` → `BackButtonBig onBack={()=>navigate('/older-adult?u='+userId)}` → `NavyLabel`"Meine Woche" → Card "Deine Woche" (sentence first, then `WeekBars` from `week_distances.points`: `data=points.map(km)`, `days=weekday abbr from date`, `baseline=baseline_mean/1000`, `baselineLabel="üblich · X,X km"`) → `NavyLabel`"Wo du warst" → Card (sentence + `PlaceBars` from `schematic_map.places` → `{label:placeLabel(p.label), count:p.visits}`, drop zero-visit). Loading→`LoadingState`, error→`ErrorState`.
- [ ] **Step 3:** `pnpm test`, `pnpm lint`, `tsc`. Commit.

## Task 6: Relative Insights Detail + blocks

**Files:** Modify `InsightsDetail.tsx` + `insights/{Distance,Routine,Outings,Places,Changepoints}Block.tsx`.

- [ ] **Step 1:** `InsightsDetail.tsx`: `Shell active="statistik"` → `SlimNavyHeader title="Einblicke" onBack={()=>navigate('/relative?u='+userId)}` → visible blocks via `BlockFor` → footer `{name} teilt diese Einblicke mit dir.` (muted, centred). Loading→`LoadingState text="Lädt…"`, error→`ErrorState`. Keep `hidden` filter + `BlockFor` mapping.
- [ ] **Step 2:** Each block: swap old warm `Card` for kit `InsightBlock` (q=block.question, verdict=block.verdict). Distance/Outings → recharts `BarChart` fill `#1F5FE0` radius `[5,5,0,0]`, `ReferenceLine` stroke `#6B7686` dashed, XAxis tick `{fill:'#6B7686',fontSize:12}`, YAxis hidden, height 160. Routine(line) → `LineChart` stroke `#1F5FE0` width 3 + baseline. Places → `PlaceBars` from series `{label:placeLabel(label),count}`. Changepoints → `ChangeList`-style: empty → calm green-check line "Nichts hat sich genug verändert, um es zu erwähnen."; else dot rows (feature DE + direction + means).
- [ ] **Step 3:** Keep `InsightsDetail.test.tsx` green (question + verdict text render; hidden hidden). Run it. `pnpm lint`, `tsc`.
- [ ] **Step 4:** Commit.

## Task 7: Full gates + live verify

- [ ] **Step 1:** `cd webapp && pnpm exec tsc -b && pnpm lint && pnpm test && pnpm build` all green; `uv run pytest -q` green.
- [ ] **Step 2:** Reseed + run backend: `python -m hiptron.synthetic seed --scenario all --replace && python -m hiptron.pipeline run --stage all`; `uvicorn hiptron.backend.main:app --reload --port 8001`; `pnpm dev`.
- [ ] **Step 3:** Headless-Chrome screenshot `/`, `/older-adult/week?u=helga`, `/relative/insights?u=helga` and `?u=otto` (amber); confirm real data renders, no console errors; eyeball vs bundle.
- [ ] **Step 4:** Final commit.

## Self-review notes
- Spec coverage: ModeChooser ✓(T4) WeekView ✓(T5) InsightsDetail ✓(T6) loading/error ✓(T2). German/non-medical wording preserved (reuse existing strings). Charts subordinate (sentence/verdict above viz) ✓.
- Type consistency: `WeeklyTrend`/`WeeklyTrendPoint` reused; `Place.visits` added both sides; `InsightBlock` series stays `Record<string,unknown>[]` (handles both daily + {label,count}).
- Risk: backend per-place series change — verdict computed from daily series first, so verdict text unchanged; existing backend tests only check key presence.
