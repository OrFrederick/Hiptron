# Hiptron Mobility Insights

Prototype for the OneAIM challenge "Understanding Mobility Changes Before Emergencies Happen". GPS-only mobility analysis for older adults using a rollator, surfaced through a kind, privacy-respecting webapp.

The point: detect and explain gradual changes in everyday walking patterns *before* a critical event, in a way that feels supportive — not surveilling.

## What's here

- **Synthetic GPS generator** — 8-week scenarios with knobs for distance decline, fatigue onset, place repertoire shrink.
- **DuckDB pipeline** — 7 stages: walk segmentation → features → place clustering → daily aggregates → rolling baselines → CUSUM change-point detection → audience-tagged insight templates.
- **FastAPI backend** — read-only DuckDB → JSON for three endpoints (older-adult home, relative home, relative insights detail).
- **React webapp** — single PWA with two modes (older-adult / relative), schematic SVG map, mobile-first.
- **End-to-end tests** — 4 synthetic scenarios (no decline, distance decline, fatigue, place shrink) verify the full pipeline + API output.

## Quick start

```bash
just install                       # uv sync + pnpm install
just pipeline run --stage all      # populates data/hiptron.duckdb (~3 min)
just backend                       # FastAPI on :8000
just dev                           # Vite dev server on :5173
```

Then open <http://localhost:5173> and pick a mode.

## Repo layout

```
hiptron/        Python package
  synthetic/    Scenario-driven GPS generator
  pipeline/     Stage runner + CLI + 7 stages
  backend/      FastAPI + Pydantic + DuckDB read queries
  db/           Schema + connection helper
webapp/         React + Vite + TS + Tailwind PWA
tests/          Pytest suites (30 tests)
docs/superpowers/
  specs/        Design spec
  plans/        Implementation plan
  design/       UI/UX design brief
data/           DuckDB file (gitignored)
index.html      Standalone iPhone-mockup showcase
justfile        Task runner
```

## Architecture notes

- **DuckDB for everything** at v0 — raw fixes, intermediate tables, insights all live in one `.duckdb` file. Single binary, no server. Cloud swap path is MotherDuck or Postgres later.
- **Per-user baseline** (not population ML) — every alert traceable to feature + threshold, explainable, no cold-start training.
- **Template insights** — no LLM in v0. Two audience-tagged template strings per change-point (older-adult kind, relative factual).
- **Insight earns the chart** — every chart in the relative app has a sentence-level verdict above it. No charts for decoration.
- **Privacy** — relative mode never sees raw coordinates or a map, only named places + counts. Older-adult mode is the only place a schematic map (own data) appears.

## Status

Prototype. Not production. Tagged `v0-functional-prototype` on `main`. The `design-import` branch holds an alternative standalone `index.html` showcase (iPhone-framed mockups of all five screens, single self-contained file).

## Documents to read first

1. `docs/superpowers/specs/2026-05-24-hiptron-mobility-insights-design.md` — the spec (what + why).
2. `docs/superpowers/plans/2026-05-24-hiptron-mobility-insights-plan.md` — 22-task implementation plan.
3. `docs/superpowers/design/2026-05-24-hiptron-ui-design-brief.md` — UI/UX brief for a designer.
