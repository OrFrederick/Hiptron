# Hiptron UI/UX Design Brief

**Date:** 2026-05-24
**For:** A frontend/UI designer (human or Claude with `frontend-design` skill) producing screen designs, component visuals, and a design system for the Hiptron Mobility Insights prototype.
**Spec reference:** `docs/superpowers/specs/2026-05-24-hiptron-mobility-insights-design.md`
**Implementation plan:** `docs/superpowers/plans/2026-05-24-hiptron-mobility-insights-plan.md`
**Existing rough mockups (HTML):** `.superpowers/brainstorm/17837-1779627967/content/{older-adult-home,relative-home,waiting}.html` — use as starting reference; redesign expected.

---

## 1. Product, in one paragraph

Hiptron is a smart sensor retrofit for rollators. The Mobility Insights prototype is a single mobile-first PWA with two modes — **Older-Adult** and **Relative** — that turn GPS data into kind, useful insights about everyday mobility. The product must feel **supportive, never surveilling**; **gentle, never clinical**; **specific, never decorative**. Every screen should help a user trust the product more, not less.

---

## 2. Audiences

### Older Adult ("Helga")
- Age 70+, uses a rollator outdoors, has a phone but rarely installs apps.
- Wants light, daily reassurance. Notices kind notes. Dislikes feeling tracked, judged, or compared to others.
- Reads slowly. Doesn't recognise icons without labels. Cataracts + dry-finger taps are real.
- **Design implications:** ≥18 pt body type, ≥48 pt hero numbers, ≥44 px tap targets, AA contrast minimum (prefer AAA), no icon-only buttons, no red, no "you missed".

### Relative ("Anna")
- Age 40–60, lives apart from the older adult, generally tech-comfortable.
- Wants reassurance without surveillance. Looks once per day, more when worried.
- Will skim. Wants to know "is the routine holding" without reading numbers unless prompted.
- **Design implications:** insight-first headlines, charts subordinate to sentences, progressive disclosure (calm home → deep drill-down), zero raw location, never the word "alert".

---

## 3. Brand tone

| Quality | Yes | No |
|---|---|---|
| Voice | warm, plain, calm | medical, marketing, alarmed |
| Imagery | small, considered, human | stock photos of frail seniors |
| Colour mood | warm neutrals, moss green, soft amber | red, neon, hospital blue |
| Density | spacious, generous padding | dashboard-dense |
| Personality | a kind GP's waiting room | a sports tracker, a hospital chart |

**Words to use:** *gentle, steady, kind, your, today, this week, worth noticing, take it easy.*
**Words to avoid:** *alert, risk, abnormal, monitor, decline, deterioration, fall, emergency, score.*

---

## 4. Visual system

### Colour palette (starter — refine as needed)

| Token | Hex | Use |
|---|---|---|
| `warm.50` | `#FBF7F2` | page background |
| `warm.100` | `#F4ECE2` | cards |
| `warm.200` | `#E9D9C5` | dividers, secondary surfaces |
| `warm.800` | `#3D2F22` | body text |
| `moss.400` | `#7BA688` | positive accents (streak, walks) |
| `moss.600` | `#4F7E5E` | primary action, home dot, "good" status |
| `amber.500` | `#D89B4A` | "worth noticing" only (never red) |

All combinations of `warm.800` on `warm.50` / `warm.100` / `warm.200` must meet **AA contrast** (4.5:1) at body sizes. Verify with a contrast tool — re-pick warm tones if any pair fails.

### Typography
- System fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
- Optional brand face: a humanist sans (e.g. *Source Sans 3*, *Inter*, *Nunito Sans*). Pick one and propose.
- Scale (mobile):
  - Hero number: 48 px / 700 — used for "yesterday's distance".
  - H1: 28 px / 600.
  - H2: 22 px / 600.
  - Body: 18 px / 400.
  - Small: 14 px / 400 — for footers and meta only; never for actionable info.

### Iconography
- Use sparingly. Always paired with a label. Suggested set: Phosphor (regular weight).
- For older-adult mode prefer text + emoji glyph (⭐, ♥, 💌) over icon fonts — emoji renders large and recognisable.

### Spacing + radius
- 4 px grid.
- Card radius: 24 px (`rounded-3xl`). Pill buttons: full radius.
- Card shadow: very soft (`shadow-sm` only).

---

## 5. Layout principles

1. **Single column, mobile-first.** Max content width 24 rem (~384 px). Side-padding 16 px.
2. **One scrollable stack of cards** on each home screen. No tabs, no nav bar in the older-adult mode.
3. **Vertical rhythm:** 16 px gap between cards.
4. **Headline first, viz second.** Each card with data shows a sentence-level insight ABOVE its chart, in larger type than the chart's labels.
5. **Tappable cards expand inline or route to a focused detail view.** Never modal stacks.

---

## 6. Screens to design

For each screen, please produce: a hi-fi mock at iPhone 14 Pro width (390 × 844 px), a brief annotation of the components used, and any state variants (loading, empty, "worth noticing", error).

### 6.1 Mode chooser (`/`)
- Title "Hiptron", short tagline.
- Two large buttons stacked: "Older-Adult mode" (filled moss) and "Relative mode" (outline moss).
- Only used in prototype — replace with auth-driven mode binding later.

### 6.2 Older-Adult Home (`/older-adult`)
Cards in order:
1. **Greeting** — "Good morning, Helga", date.
2. **Yesterday's walk** — hero distance (e.g. "1.45 km") + soft subtitle "via bakery and park". Empty state: "No outdoor time yet today — that's okay."
3. **Schematic map** (tappable → week view) — SVG, warm background, dots for places labelled in plain text, walk line in moss green, home as a larger moss-green dot ringed in cream. Designed to feel hand-drawn, not cartographic.
4. **Streak** — only if ≥1 day. Soft star + plain copy "5 days in a row outside".
5. **Family note** — only if present. Soft warm card, line like "💌 Anna sent a heart for your walk yesterday".
6. **Trend card (conditional)** — only when a sustained change fires. Kind phrasing only. Never amber, never red, never the word "decline".

### 6.3 Older-Adult Week View (`/older-adult/week`)
- Back link.
- Single card: title "Your week", bar chart of daily distance (km), one supporting sentence: "Each bar is a day's walking distance, in kilometres."
- Below: chronological list of named places visited this week with frequency dots.

### 6.4 Relative Home (`/relative`)
Cards in order:
1. **Status card** — coloured dot (moss = green, amber = worth noticing), one-line summary ("Routine looks normal."), last update meta, **Send ♥** pill button on the right. Whole card tappable → Insights detail.
2. **Weekly trend card** — headline sentence ("Walking distance steady this week"), bar chart with baseline reference line, 1-line legend.
3. **Worth noticing (conditional)** — amber-bordered card, plain-words explanation, two pill buttons: "See details" + "Mute 7 days".
4. **Footer** — small reminder: "Helga controls what you see. You see trends, never raw location."

### 6.5 Relative Insights Detail (`/relative/insights`)
- Back link.
- Five question-titled blocks (designer decides best order, default below):
  1. *Is the daily routine holding?* — line chart (routine adherence) + baseline.
  2. *How far is Helga going?* — bar chart (distance + activity radius) + baseline.
  3. *Are walks getting harder?* — line chart (within-walk fatigue).
  4. *Where has she been?* — list of named places with visit counts (no map, simple frequency bars).
  5. *Any change-points lately?* — chronological list. Empty state copy: "Nothing has changed enough to mention."
- Each block: question (uppercase tracking-wide, small), verdict (lg medium), viz (40–48 vh max), no extra chrome.
- Hidden if data < 4 weeks (cold-start).

### 6.6 Loading + error states (apply to every screen)
- Loading: full-screen calm message ("Loading your day…", "Loading…").
- Error: never alarm. "Something went quiet. Try again later."

---

## 7. Components inventory

Please design and document these primitive components:

- **`Card`** — radius 24, warm-100 fill, warm-200 border, 20 px inner padding, optional tap state (scale 0.99 active), min-height 44 px.
- **`PillButton`** — full radius, 16 px horizontal padding, 12 px vertical, two variants (filled moss / outline moss / neutral warm-200).
- **`StatusDot`** — 16 px circle, moss-600 or amber-500, with `aria-label`.
- **`SentenceHeadline`** — body-lg, weight 500, leading-snug. Always present above any chart.
- **`MetaText`** — small, warm-800 at 60% opacity. Used for "last updated", footers.
- **`HeroNumber`** — 48 px, weight 700, baseline-aligned with optional unit.
- **`BarRow`** — bar chart row inside a card, fixed 160 px height, no Y axis labels (replaced by reference line + sentence).
- **`PlaceList`** — list of `(label, frequency)` rows with mini bar.
- **`MapSchematic`** — SVG-only, no tiles. Home in centre by default, places labelled as plain text. Designer to spec the visual treatment (dots vs. mini icons, line stroke, optional hatched "comfort zone" ring).

---

## 8. Accessibility requirements

Hard constraints — designs must satisfy these:

- All interactive elements ≥ 44 × 44 px tap area.
- Body text contrast ≥ 4.5:1 against its background. Hero text ≥ 3:1. Verify against `warm.50` and `warm.100`.
- Never rely on colour alone — status dots paired with summary text, "worth noticing" paired with an amber border AND the word "Worth noticing", never just a colour change.
- Focus rings visible on every interactive element (use 2 px moss-600 outline at 2 px offset).
- Screen-reader names for every icon/dot/glyph (`aria-label="status green"`, `aria-label="home"`, `aria-label="walk path"`).
- No autoplaying motion, no parallax. Subtle 150 ms transitions only.
- Older-adult mode must be readable from arm's-length without zoom on a 6-inch phone.

---

## 9. Privacy in the UI

The privacy posture should be visible, not hidden in settings:

- Relative mode: **no map, no coordinates, no live position, ever**. Place names only, frequency bars only.
- Older-adult mode: schematic map is allowed because it's the user's own data — but treat it as illustrative, not navigational. No street labels, no real tiles.
- Footer on the relative home and insights detail screens: "Helga controls what you see."
- Settings (out of scope for v0 but design a placeholder card): a single big switch "Share activity with Anna" — default on for trends, off for raw routes.

---

## 10. Deliverables expected from designer

1. **Style tile** — palette + type scale + radius + shadow tokens, exportable to `webapp/tailwind.config.ts`.
2. **Hi-fi mocks** for each of the 5 screens above + their loading/empty/error states (Figma frames or PNG export).
3. **Component sheet** for the 9 primitives in §7.
4. **Schematic map specimen** at three densities: 2 places / 5 places / 10 places, showing how labels are placed to avoid collision.
5. **PWA icon set** at 192 px and 512 px (currently placeholder solid moss-600).
6. **Optional:** lightweight motion guidance (durations, easing) — keep it minimal.

Tag handoff with the relevant Tailwind tokens; the implementation plan expects to plug values into `tailwind.config.ts` and components named exactly as in §7.

---

## 11. Out of scope for this brief

- Onboarding / setup flow detail (design later when auth model is decided).
- Settings screen detail beyond the single switch concept.
- Native app polish (PWA install prompt is fine).
- Push notification visual style.
- Email + paper-letter touchpoints (mentioned in spec only as future).

---

## 12. Open design questions to resolve with PM

1. Should the schematic map use hand-drawn-style strokes (warm, illustrative) or clean geometric strokes (modern, calm)? Recommend one and show both as variants.
2. Single brand typeface, or system stack only? Recommend.
3. Send ♥ button — does it animate on tap? If so, what micro-interaction (heart-burst, soft pulse)?
4. Should the older-adult mode greet by time of day ("Good morning" / "Good afternoon") or always "Hello"? Recommend.
5. Mode chooser visual — is this hidden in production once auth lands, or kept as a settings affordance?

Surface answers in your design notes alongside the mocks.
