# Plan: Simplify Senior view + Beobachtung-to-top (Relative)

Branch: `feat/simplify-senior-relative`. React 18 + Vite + TS, Tailwind + inline styles. Mobile pitch prototype, max-width 420px. No frontend test suite (vitest covers python backend only) → verification = `npm run build` (tsc -b && vite build) green + visual check.

## Global constraints
- Senior view = motivational, NEVER diagnostic/alarming. No "Sturz", Klinik, Heim, risk scores. Decline framed kindly ("wieder etwas mehr unterwegs").
- Number coherence: one anchor value, no invented percentages; new numbers must agree with existing week_distances.
- Don't re-bake JSON (would clobber hand-tuned working-tree edits). Edit JSON by hand where needed.
- Large, readable senior typography; keep existing HIP theme tokens & Card/SectionLabel kit.

## Task A — Senior bottom bar: only "Start"
File: `webapp/src/shared/kit.tsx` (BottomTabBar, ~628). In the `mode === "older"` branch keep ONLY the `home`/"Start" tab; remove "Meine Woche" (stats) and "Profil". Leave the `relative` branch untouched. Bar still renders (single tab).

## Task B — Senior Start redesign
File: `webapp/src/modes/older-adult/Home.tsx` (+ new card components, + 4 JSON edits).
New section order:
1. PersonaSwitcher (only when `!embed`, top-right) — keep as-is.
2. **Slim greeting** — reuse `HeroCard` for greeting + name + avatar + profile link, but WITHOUT a motivational tagline (avoid duplicating motivation card). Keep profile reachable here since Profil tab is gone.
3. **MotivationCard** (new) — status-driven, big warm German copy:
   - `green`: praise ("Du machst das richtig gut – weiter so!").
   - `amber`: gentle encouragement to move more ("Magst du heute eine kleine Runde drehen? Schön, wenn du wieder etwas mehr unterwegs bist."). Never alarming.
4. **Wochenübersicht** (new compact summary card) — short sentence from `week_distances.points`: active days + avg distance/day. Neutral/kind tone.
5. **Monatsübersicht (distance chart)** — `SectionLabel` "Monatsübersicht" + the daily distance bar chart reused from existing (`WeekBars` big, as in WeekView, or WeeklyTrendCard). Baseline = `week_distances.baseline_mean` (the 4-week/month mean → fits "Monats"). Caption e.g. "Balken = Tag · gestrichelt = Monatsschnitt".
6. **Längster Spaziergang** (new card) — title "Dein längster Spaziergang diese Woche" + length + **duration** + day, from `highlight` (kind longest_walk).
Remove: Checklist card, StatCard "Bewegung", SchematicMap, FamilyNoteCard, old TrendCard, "Mein Tag" label.

JSON edits — add duration to longest-walk `highlight.detail` in `webapp/public/api/older-adult/home/{helga,ingrid,margarete,otto}.json` (coherent w/ existing km):
- helga: `0,6 km · 22 Min · Donnerstag`
- ingrid: `1,6 km · 38 Min · Dienstag`
- margarete: `1,2 km · 30 Min · Sonntag`
- otto: `1,2 km · 28 Min · Sonntag`
(Files are minified single-line JSON — edit only the highlight.detail value.)

## Task C — Relative: Beobachtung to top
File: `webapp/src/modes/relative/Home.tsx`. Move the `data.worth_noticing && <WorthNoticingCard …>` block to be the FIRST content card after `<RelativeHeader>`, above `<SummaryRow>`. Keep all other ordering (SummaryRow → WeeklyTrendCard → MapCard → Neueste Aktivitäten → Footer).

## Verification
Each task: `cd webapp && npm run build` green. Final: playwright screenshots of `/older-adult` and `/relative` (all 4 personas) to confirm layout + no map on senior + Beobachtung on top.
