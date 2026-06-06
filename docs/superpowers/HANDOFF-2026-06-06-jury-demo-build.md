# Handoff — Jury-Demo Build (2026-06-06)

**State:** Brainstorm + spec + plan complete and committed. No implementation started. Working tree has pre-existing unrelated edits (not part of this build).

**Next action:** Execute the plan via **subagent-driven-development (option 1)** — fresh implementer subagent per task + two-stage review (spec compliance, then code quality). Do NOT execute inline.

## Start here

1. Invoke skill `superpowers:subagent-driven-development`.
2. Plan: `docs/superpowers/plans/2026-06-06-hiptron-jury-demo-build.md` — 10 tasks, TDD, self-contained code in every step. Extract all task text into TodoWrite up front; give each implementer subagent the full task text (don't make them read the plan file).
3. Spec (the "why"): `docs/superpowers/specs/2026-06-06-hiptron-jury-demo-build-design.md`.
4. Execute continuously, task 1 → 10. Only stop on BLOCKED you can't resolve.

## Task order (summary)
1. Real home-anchored life-space radius (fix `_04` `MAX(distance/2)` bug)
2. Retire `fatigue_index`, track `n_outings` end-to-end
3. Generator knobs: outings-taper + per-persona place subset
4. 4 personas (helga/otto/margarete/ingrid) + `seed --scenario all`
5. All-clear reassurance default (older-adult trend card)
6. In-app persona switcher + `?u=` threading
7. OutingsBlock + dispatch swap
8. SchematicMap clamp + edge cases + vitest
9. E2E per-persona signatures + cross-user isolation + ingrid all-clear
10. Reseed + pipeline + Playwright sweep
- Optional STRETCH: new-place card (defer unless time).

## Must-know quirks
- **Backend port:** run uvicorn on **8001** (vite proxy expects 8001; the justfile's `backend` target uses 8000 — mismatch, use 8001).
- **Vite** served on **5174** last run (5173 was occupied).
- **Playwright** is not a webapp dep — driver imports from `~/.npm/_npx/<hash>/node_modules/playwright-core` (CommonJS: `import pw from "..."; const { chromium } = pw;`). Sample driver at `/tmp/drive.mjs`.
- Reseed all personas: `python -m hiptron.synthetic seed --scenario all --replace` → `python -m hiptron.pipeline run --stage all` (~3 min).
- Run full Python tests: `uv run pytest`. Webapp: `cd webapp && pnpm lint && pnpm build && pnpm vitest run`.

## Decisions (don't relitigate)
- **Not a medical device / no diagnosis** — every insight is an everyday-pattern observation. This is why fatigue was retired (not fixed) and margarete's signature is "outing-frequency drop," not "fatigue." (memory: `feedback_not_medical_device`)
- Place labels are heuristic (`_03 _auto_label`) — decided NOT to add new label-types (too fragile); richer maps via more weeks/outings + per-persona subsets.
- Persona switch = in-app dropdown + `?u=` URL param (not picker screen).

## Commits so far
- `683004d` spec · `f2127b4` plan. Memory updated: `project_jury_demo_build`, `feedback_not_medical_device`.
