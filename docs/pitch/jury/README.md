# OneAIM / Hiptron Pitch Jury — Reference

Five jurors. Different lenses. Pitch must hit each. Use these profiles to build slides, anticipate Q&A, and spawn simulation agents (see `../SIMULATION.md`).

## The Jurors

| # | Name | Role | Lens | File |
|---|------|------|------|------|
| 1 | **Univ.-Prof. Dr. med. Dipl.-Phys. Daniel Truhn** | Chair AI in Medicine, RWTH; senior radiologist Uniklinik RWTH Aachen | Clinical AI rigor, validation, MDR boundary, federated/edge architecture | [01_truhn.md](01_truhn.md) |
| 2 | **Tom Debus** | Co-founder & CTO, Ferris Labs AG (Zürich) | Regulated-industry AI architecture, hybrid knowledge graph + LLM, change management, adoption, Discovery→Crawl→Walk→Run | [02_debus.md](02_debus.md) |
| 3 | **Dr. Michael Franz** | Sales Architect, Deal Coach, HPS-DACH GF (Essen) | Buyer clarity, value quantification, disqualification discipline, Buying-Table, deal logic | [03_franz.md](03_franz.md) |
| 4 | **Dr.-Ing. Ralf Schimweg** + **Dr. Laura Elgeti** | Co-Geschäftsführer, MA&T Sell & Partner (Würselen, RWTH spinoff 1993) | Schimweg: participatory org dev, Pflege rollout, change-mgmt. Elgeti: B2B Customer Success, subscription value-prop adaptation, retention | [04_mat_leadership.md](04_mat_leadership.md) |
| 5 | **Tim Janke** | Founder, Hiptron; RWTH WZL Production Analytics lead | Customer-in-the-room. Wrote the brief. Brand alignment, anti-surveillance, relatives-UX, subscription compatibility | [05_janke_hiptron.md](05_janke_hiptron.md) |

## Cross-Jury Synthesis

### What ALL FIVE will reward
- Clear separation of **measurement** from **explanation** (Truhn, Debus, Janke).
- **Anti-surveillance, dignity-first** framing operationalised in the UI (Janke, MA&T, Truhn).
- **One named buyer** with one named price + trigger event (Franz, Debus, Elgeti).
- **Real co-design evidence** with older adults *and* relatives (MA&T, Janke).
- Honest statement of **what's explicitly out of scope** (Janke — direct echo of his brief; Truhn — regulatory boundary).

### What ALL FIVE will penalize
- Any drift toward **fall detection / medical / surveillance** vocabulary (Janke explicit; Truhn regulatory; MA&T cultural).
- **"AI-powered"** without specifying which knowledge type / which features (Debus, Truhn).
- **TAM-spray** ("everyone over 70") instead of one buyer, one channel (Franz, Debus).
- **Subscription without a value-receipt** for month 12 when nothing has gone wrong (Elgeti, Franz).
- **Patronising / clinical-looking UI** (Janke, MA&T).

### Lens conflicts to manage
- **Truhn vs. Janke on medical boundary**: Truhn will push you to be regulatorily explicit; Janke wants you to stay brand-safe non-medical. Best move: name the MDR/AI-Act clauses *and* keep the user-facing language soft.
- **Franz vs. MA&T on speed**: Franz wants disqualification discipline and a closing deal; MA&T thinks in 2–3-year change cycles. Best move: show a tight 8-week Discovery pilot (Debus's framing) that includes participation/training (MA&T's framing).
- **Debus vs. Janke on architecture detail**: Debus wants hybrid knowledge architecture on a slide; Janke wants the slide to feel like Aesop not Sanitätshaus. Best move: one "how it works" slide for Debus, hidden behind a calm "what it does" slide for Janke.

### Weighted importance (rough)
- **Janke = most important** (1.5× weight). Customer-in-room. Wrote brief. Will use your framing.
- **Truhn** & **MA&T** tied second — clinical credibility + adoption realism are make-or-break.
- **Debus** & **Franz** balance the commercial/architecture side. Lower weight in scoring, but if you fail their tests the rest don't matter.

## Brief Recap (so the pitch never drifts)

- **IN scope:** AI mobility pattern analysis, dashboard & UX concepts, behaviour trend interpretation.
- **OUT of scope:** medical diagnosis, emergency/fall detection, production-ready software.
- **Primary user perspective:** **relatives**.
- **Mobility signals named:** distance, routines, pauses, outdoor activity, activity radius.
- **Priorities:** privacy, trust, emotional acceptance ≥ technical accuracy.
- **Hiptron positioning:** non-medical safety & mobility product. *"Vom Hilfsmittel zum smarten Begleiter."*

## What to do next
1. Read each profile end-to-end before drafting slides.
2. Map every slide to at least one juror's hot button.
3. For each known red flag, decide whether to remove it or pre-empt it.
4. Use `../SIMULATION.md` to run pitch dry-runs against agent-personas before the real event.
