# Pitch Simulation — Runner

How to use the jury profiles in `jury/` to simulate the OneAIM / Hiptron pitch via Claude subagents.

## When to use

- After a slide draft exists — *before* dress-rehearsing live.
- After every major slide rewrite — fast async feedback loop.
- To stress-test the brand line against Janke's voice, or the value prop against Franz's voice.

## Modes

### Mode A: Single-juror deep critique
Spawn one subagent that reads one profile + your slides, produces structured feedback in that juror's voice.

Use when: iterating on one specific dimension (e.g. business model → Franz; architecture → Debus).

### Mode B: Full-jury parallel critique
Spawn five subagents in parallel, each playing one juror. Each returns structured feedback. Then synthesize the conflicts.

Use when: full dress rehearsal.

### Mode C: Adversarial Q&A
Spawn one juror as a conversational agent (Mode A, but with `SendMessage` follow-ups). Pitch verbally / via slides, answer questions, get pushback. Use this 1–2× per juror near the event.

## Inputs the sim agent needs

For every spawn:
1. Path to the juror's profile file (`docs/pitch/jury/0X_*.md`)
2. Path to your current slide deck (PDF / md / images / link)
3. Optional: pitch script / talking points
4. Output spec (see below)

## Sim agent prompt template (copy + edit)

```text
You are playing **<JUROR NAME>** at the OneAIM / Hiptron student-challenge final, June 2026 in Aachen. You are giving feedback on a student pitch about AI for detecting meaningful mobility changes in older-adult rollator users — explicitly non-medical, primary user perspective = relatives.

## Persona source (READ IN FULL FIRST)
File: /Users/frederick/Development/Hiptron/docs/pitch/jury/<NN_juror>.md

Embody the voice, values, hot buttons, red flags, scoring rubric, and sample feedback patterns from that file. Quote yourself where the profile gives you direct quotes. Do not break character. If the profile marks something `[inferred]`, treat it as a working hypothesis — phrase it tentatively rather than as fact.

## Brief recap (so you don't drift from the challenge framing)
- Challenge: "Understanding Mobility Changes Before Emergencies Happen"
- IN scope: AI mobility pattern analysis, dashboard & UX, behaviour trend interpretation
- OUT of scope: medical diagnosis, fall/emergency detection, production-ready software
- Primary user perspective: relatives
- Signals: distance, routines, pauses, outdoor activity, activity radius
- Priorities: privacy, trust, emotional acceptance ≥ technical accuracy
- Hiptron position: non-medical safety & mobility product

## Pitch artifacts to review
<PATHS TO SLIDES / SCRIPT — read these next>

## Output (strict structure)

```markdown
# <Juror Name> — Feedback on Pitch v<N>

## First-Impression (one sentence, in your voice)

## Per-Slide Reactions
Slide-by-slide. For each slide: ONE sentence reaction, then ONE follow-up question in your voice.

## Top 3 Questions You Would Ask Live
[in your native register — German or English per the profile]

## Top 3 Objections
[name them; one sentence each]

## Score Against Your Implicit Rubric
[use the rubric from your profile; produce a number per dimension and a one-line justification]

## Verdict
One paragraph. In your voice. End with one targeted recommendation.
```

Stay in character throughout. Do not break the fourth wall. Do not give Claude-style meta-commentary. The pitch team will read this as if from you.
```

## Workflow: running Mode B (full panel)

```text
1. Finalize current slide deck → export to PDF in known path.
2. Spawn 5 subagents in parallel via Agent tool, each with prompt above, pointing to the matching profile.
3. Collect all 5 outputs.
4. Synthesize:
   - Where do they agree? → highest-priority changes.
   - Where do they disagree? → look up "Lens conflicts" in jury/README.md.
   - What did you NOT prepare for? → that's the gap to fix.
5. Iterate slides. Repeat.
```

## Workflow: running Mode C (adversarial Q&A)

```text
1. Spawn one subagent with the template above + a name (e.g. SendMessage handle "truhn-live").
2. Pitch — paste the section you want to defend.
3. The agent replies in-character with questions + pushback.
4. Use SendMessage to keep the same agent context across rounds.
5. End when you've defended cleanly or know exactly which slide to rewrite.
```

## Anti-patterns

- **Don't pool the prompts.** Each juror needs a separate spawn — combining lenses dilutes voice.
- **Don't trust the score blindly.** The scoring rubrics are inferred. Use them to find weak spots, not as the actual scoreboard.
- **Don't ask the sim agent for "good pitch advice."** Ask them to react in character. Strip the meta-question.
- **Don't simulate without slides.** A juror cannot give per-slide feedback on a verbal description.

## Suggested cadence (last 7 days before pitch)

- **Day -7:** Mode B full-panel critique → identify top 5 gaps.
- **Day -5:** Iterate; Mode A on Janke (most weight) + Franz (commercial discipline).
- **Day -3:** Mode B again → check the gaps closed.
- **Day -1:** Mode C with Truhn and Janke (the two hardest interactive jurors).

## Files

- `jury/README.md` — index + cross-jury synthesis
- `jury/01_truhn.md` … `jury/05_janke_hiptron.md` — per-juror deep profiles
- `SIMULATION.md` (this file) — runner spec
