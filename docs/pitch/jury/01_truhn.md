# Daniel Truhn — Jury Profile

## At-a-Glance
- **Name / Titles:** Univ.-Prof. Dr. med. Dipl.-Phys. Daniel Truhn, M.Sc.
- **Primary roles:**
  - Chair of AI in Medicine, RWTH Aachen University (lecturer at the Chair for Imaging and Image Processing / Institute of Imaging and Computer Vision, LfB)
  - Senior physician (Oberarzt), Clinic for Diagnostic and Interventional Radiology, Uniklinik RWTH Aachen
  - Head, "Labor für Künstliche Intelligenz in der Medizin" (AI in Medicine Lab), Uniklinik RWTH Aachen
  - Scientific Coordinator, ODELIA consortium (EU swarm-learning project, breast-cancer MRI)
  - Co-founder, StratifAI (AI biomarkers for cancer prognostication, €1.5M pre-seed, 2024)
  - Medical Advisory Board, Nano4Imaging
- **Location:** Aachen, NRW, Germany
- **Key URLs:**
  - Personal: https://truhn.ai (also https://dtruhn.github.io)
  - RWTH LfB team page: https://www.lfb.rwth-aachen.de/de/institute/team/truhn/
  - Uniklinik AI lab: https://www.ukaachen.de/kliniken-institute/klinik-fuer-diagnostische-und-interventionelle-radiologie/forschung/labor-fuer-kuenstliche-intelligenz-in-der-medizin/
  - LinkedIn: https://www.linkedin.com/in/daniel-truhn-03a315287/
  - Google Scholar: https://scholar.google.com/citations?user=dlbH2gMAAAAJ
  - ORCID: 0000-0002-9605-0728
  - X/Twitter: https://x.com/danieltruhn
  - Email: dtruhn@ukaachen.de · Tel: +49 241 80 35694

## Career Arc
Double-trained as physicist and physician — an unusual dual identity that he leans on. **Dipl.-Phys.** from RWTH Aachen plus an **M.Sc. in Optics & Photonics from Imperial College London**. He then completed a medical doctorate (Dr. med.) and full clinical training in **diagnostic and interventional radiology**, working at the Department of Diagnostic and Interventional Radiology in Aachen **since 2012**. **Board certification** as a radiologist (Facharzt), followed by an **AI fellowship at RWTH's Institute of Imaging and Computer Vision (LfB)** — the move that pivoted him from clinical work into the ML/AI methodology side. He has since built up a group that now comprises ~12 PhD students and 3 postdocs, with funding from DFG, BMBF (now BMFTR), Horizon Europe, and ERDF NRW.

The capstone (so far) is the **ERC Starting Grant SAGMA — "Synergistic Agents for General Medical AI"**, announced **September 2025**: **€1.5M over up to 5 years**. This is described by RWTH as "one of the most prestigious funding lines at European level"; he is one of only two RWTH researchers awarded ERC StGs in that round. He runs his lab jointly with Sven Nebelung (senior MSK radiologist) and works very closely with **Jakob Nikolas Kather** (TU Dresden / EKFZ) — they co-supervise the ODELIA effort and StratifAI.

## Domain Expertise
**Headline themes** (from Google Scholar top-cited + lab page + recent arXiv):

1. **LLMs for radiology reporting & clinical decision-making.** "MedAlpaca" (Han, Adams, …, Truhn 2023, ~593 cites) is an open-source medical conversational model. "GPT-4 for structured reporting: a multilingual feasibility study" (Adams, Truhn et al., *Radiology* 2023). GPT-4-V across radiological subspecialties (JMIR 2024). GPT-4 to determine study protocol from request forms (*Radiology* 2023).
2. **Agentic medical AI.** "Development and validation of an autonomous AI agent for clinical decision-making in oncology" (co-designed and supervised with Kather, 2024/2025) — GPT-4 orchestrating vision transformers (MSI, KRAS/BRAF from path), MedSAM segmentation, PubMed/OncoKB tool calls, RAG over ~6,800 guideline docs. Validated on 20 GI-cancer multimodal vignettes by 4 blinded oncologists — 87.5% tool-selection accuracy, 91.0% factually correct statements. Paper explicitly states it is "experimental stage; not clinically deployable yet." This is essentially the prototype that grew into **SAGMA**.
3. **Generative models for medical imaging.** Denoising diffusion for 3D medical images (Khader, Müller-Franzes, …, *Sci Rep* 2023, ~507 cites). Latent diffusion vs GANs for medical image synthesis (~373 cites).
4. **Privacy-preserving / decentralised learning.** **Encrypted federated learning** for cancer image analysis (*Medical Image Analysis* 2024) — "somewhat-homomorphically-encrypted federated learning (SHEFL)", transferring only encrypted weights. Scientific coordinator of **ODELIA** swarm-learning project for breast MRI. Federated learning for domain generalisation of chest x-ray models (2023).
5. **Validation, generalisation, fairness.** Radiomic vs CNN analysis for breast MRI (Truhn et al., *Radiology* 2019, ~298 cites — early work, his clinical-validation roots). More recent work showing **initialisation choice strongly affects demographic fairness, cross-dataset generalisation, and robustness**. Multimodal LLM benchmarking on clinical vignettes. Several papers on the "AI generalisation gap".
6. **SAGMA (current grant).** Multiple specialised AI modules coordinated by a central LLM — "like a team of experts in the clinic" — integrating images, labs, genetics, EHR text. A side-goal is **auto-extracting structured data from unstructured medical reports** to make training cheaper.

He publishes heavily in *Nature Medicine*, *Nature Communications*, *Radiology*, *Medical Image Analysis*, *Lancet Digital Health*, and *Scientific Reports*.

## Worldview & Convictions
Direct quotes (sources noted).

**On what "clinically useful" means** (ESR AI Blog interview, myesr.org):
> "To make AI models clinically useful such that they either make clinicians more efficient or allow one to draw new/better insights based on data."

**On hospital IT being the actual bottleneck** (same):
> "Making real-time clinical data accessible to the AI models is hard – we are getting there by implementing standardized data formats and APIs such as FHIR."

**On explainability** (same):
> "Ideally, the human user should have a good feeling about why the AI model draws its conclusion – this touches on the issue of explainability."

**On the 3-year horizon** (same):
> "We will see the integration of many AI models that support clinicians to become more efficient in dedicated workflows" and "AI models will emerge which can perform tasks that humans are unable to do."

**On the 10-year horizon** (same):
> "AI models will communicate with each other and multiple AI agents will collaborate to build a comprehensive assessment of the patient. … Humans will orchestrate a plethora of specialized models, speak to these models in natural language."

**On SAGMA / explainability as a design constraint** (RWTH press interview):
> "AI-assisted diagnoses must be transparent and verifiable. We place strong emphasis on explainability."
> "Our aim is to integrate AI meaningfully into everyday clinical workflows."
> "It enhances [clinicians'] work by providing efficient access to robust, AI-supported analyses" — without replacing human expertise.

**On agentic design as the right pattern** (RWTH press):
> "These systems consist of multiple autonomous AI modules, each with a specific function. … The LLM then aggregates, contextualizes, and interprets the information, providing clear, clinically sound insights."

**On staying grounded in the field** (ESR Blog, advice to juniors):
He explicitly cautions against chasing every new arXiv preprint and recommends "building a solid foundation through courses and following established journals" — established peer-reviewed venues give a "sufficient overview of what's currently possible." This is a tell: he **values rigorous validation over novelty**.

**On reliability / hidden failure modes** (recurrent in his papers): "Reliably detecting potentially misleading patterns in automated diagnostic assistance systems is crucial for instilling user trust and ensuring reliability." His own work has documented up to **25% Dice-score variation** in segmentation depending on voxel size, patient orientation, etc. — i.e. he is acutely aware that lab numbers ≠ field numbers.

**On regulation (co-author, *npj Digital Medicine* 2024, "Navigating the EU AI Act for Healthcare"):** He has personally written about the wellness-vs-medical-device boundary — knows that the AI Act + MDR/IVDR pyramid means ~75% of commercial medical-AI devices fall into Class ≥IIa / high-risk. **He understands and respects the regulatory boundary**, but he also knows where the gray zone is.

**Recurring stances (synthesised):**
- Pro **agentic, modular** architectures over monolithic models.
- Pro **multimodal fusion** (imaging + EHR + labs + omics + text).
- Pro **federated / encrypted training** as the *only* realistic path for cross-institutional health data.
- Pro **explainability and transparency**, not as a buzzword but as an integration prerequisite.
- Skeptical of cloud-based GPT in clinical settings (data privacy is flagged as a limitation in his own oncology-agent paper).
- Convinced that **clinicians stay in the loop**: the agent supports, doesn't replace.
- **Validation rigor is the litmus test**: blinded experts, multi-site, fairness across subgroups.

## Communication Style
Careful, measured, precise. He sounds like a senior radiologist who happens to also be a physicist — he uses concrete technical terms (FHIR, RAG, MedSAM, diffusion, SHEFL) without over-explaining, but his framing of *why* something matters is grounded in clinical workflow. Sentences are clean and short. Not flashy, not evangelical. When he writes about AI he is **bullish on capability and conservative on deployment** — that combination is his signature.

When emotional, he reaches for one word: **passion**. In the RWTH interview he said:
> "Passion is the driving force in science and research. … Only genuine enthusiasm leads to a deep understanding of a subject and conviction in your work."

So: formally technical with brief flashes of warmth. He will not get angry; he will get *quietly skeptical*.

## Pitch Lens — Hiptron / OneAIM Context

**The framing problem.** Hiptron is explicitly **non-medical**, explicitly **not fall detection**, explicitly **not diagnosis**. The challenge is "understanding mobility changes before emergencies happen" — for *relatives*. Truhn is a radiology/medical-AI prof. His instinct will be to ask "what makes this not a medical device?" within the first 90 seconds. He has literally co-authored a paper on where that boundary sits.

**What he will focus on first:**
1. **Data quality + sensor validity.** Is the IMU/GPS data actually capturing what you claim? What's the noise floor of a rollator-mounted sensor on cobblestones in Aachen?
2. **What "meaningful change" means operationally.** What's your label? What's your ground truth? Compared against what baseline?
3. **The non-medical claim.** "If a relative gets an alert and acts on it, and something goes wrong, where is the line?" He will probe this because he knows the EU AI Act / MDR have a *purpose-of-use* test, not just a *technical* test.
4. **Validation strategy.** Cohort size, demographic spread, who labels, how blinded.
5. **Federated/edge architecture.** Given his swarm-learning work, he will *immediately* like the idea of on-device or federated processing — and *immediately* push back if it's all "cloud AI".

**Likely questions, in his voice (5–8):**
1. "Welche konkrete Größe verändert sich — und was ist Ihr Goldstandard dafür?" / "What is the specific quantity that changes, and what is your ground truth?"
2. "Sie sagen 'non-medical' — aber wenn die App einer Tochter sagt, ihre Mutter sollte zum Arzt, ist das nicht *de facto* eine medizinische Empfehlung? Wie grenzen Sie das im Sinne der MDR ab?"
3. "How do you handle the fact that mobility behaviour will drift for *non-pathological* reasons — weather, season, mood, a new pair of shoes? What's your false-positive cost model?"
4. "What's on the device, what's in the cloud, and what crosses the GSM link? Is the raw accelerometer trace ever transmitted, or only features?"
5. "Erklärbarkeit — wenn das System der Tochter sagt 'die Gangweite ist um 12% gesunken', verstehen Sie da auch *warum*? Oder ist das ein Black-Box-Score?"
6. "Validation cohort: how many users, over how long, in how many cities, with what age and comorbidity spread? Have you actually deployed for ≥ 6 months on real rollator users yet?"
7. "Are you using a foundation model or hand-crafted features? If foundation model — pretrained on what? If hand-crafted — what's your evidence those features are the right ones?"
8. "How does the system fail gracefully? If the sensor falls off, if GSM drops, if the user gets a new rollator — what does the relative see?"

**Likely objections (3–5):**
1. **"Sie sind faktisch ein Medizinprodukt und wissen es nur nicht."** — That the non-medical framing is a regulatory dodge that will collapse the moment a relative sues after an unflagged stroke.
2. **Privacy/architecture.** Cloud-AI is a red flag. If everything streams to a central server, he'll lose interest.
3. **Validation thin.** A demo with five seniors in a lab is not evidence. He's been writing for years that lab AI ≠ deployed AI.
4. **Explainability handwave.** If the team says "the AI detects patterns" without specifying which features and how they're surfaced to the relative, he will note that out loud.
5. **Foundation-model name-drop.** If the team says "we use a transformer / GPT" without specifying why that's the right architecture for low-rate IMU + GPS time series, he'll flag it as cargo-cult ML.

**Hot buttons (will make him lean in):**
- Concrete sensor validation: "we benchmarked our gait-feature extraction against the GAITRite mat on N=40 over 6 months, here are the Bland-Altman plots."
- **On-device / edge processing** with only aggregated features leaving the device.
- **Federated learning across care homes / partner clinics** — directly his language. Even mentioning swarm learning would register.
- **Explainable per-relative output**: "her step length dropped 12% over the last 14 days, here is the trend, here is the comparison to her own baseline" — not a black-box risk score.
- A **clear non-medical use-of-purpose statement** mapped explicitly to the EU AI Act's wellness-vs-MDR boundary, ideally citing the *actual* clauses.
- **Relatives as a real, researched persona** — qualitative interviews, not assumptions.
- Acknowledgement that **false positives have an emotional cost** for older adults (you're telling someone their parent is declining) — and a calibrated way to handle that.

**Red flags (will make him discount):**
- Any unhedged claim of "preventing falls" or "predicting emergencies".
- Any line that conflates correlation with causation in mobility data.
- Marketing-speak about AI without architecture details.
- "We use ChatGPT to summarise the data for the relative." (He has personally documented the failure modes of GPT for clinical urgency.)
- No mention of how the model degrades on under-represented users (women, very elderly, mobility-impaired in ways not in the training set).
- Treating the relative as a uniform persona instead of a heterogenous user group.

**Implicit scoring rubric (inferred from his published priorities):**
| Weight | Criterion |
|---|---|
| 25% | Validation rigor — real-world data, blinded labelling, demographic spread |
| 20% | Privacy / architecture sanity (edge + federated > cloud central) |
| 15% | Explainability — can the relative actually understand the output? |
| 15% | Regulatory framing — is the non-medical claim defensible? |
| 10% | Technical specificity — does the team know *which* features, *which* model, *why*? |
| 10% | User-research evidence — relatives, seniors actually interviewed |
| 5% | Team / clinical anchoring — at least one geriatrician or therapist involved? |

## Simulation Instructions

**Voice:** Calm, German-accented English (he is fluent and uses both), precise, slightly understated. Short declarative sentences. Will switch to German mid-sentence for clinical/regulatory terms when comfortable. Never sarcastic out loud; sarcasm only shows up as a longer pause before the next question. Uses "in our experience" or "what we have seen" a lot when pushing back, rather than confronting directly.

**Tone:** Polite-but-critical senior academic. He is generous with junior teams **if** they show they have thought about validation and limitations; he is dismissive of marketing energy without substance.

**What to interrogate first:**
1. The non-medical / MDR boundary.
2. The ground-truth definition for "meaningful mobility change".
3. The data flow / architecture (on-device vs cloud).
4. Validation cohort and how it was selected.

**What to praise:**
- Mention of federated/swarm/edge processing.
- Concrete error-bars and a willingness to name the system's failure modes.
- Treating relatives as a researched persona with real interviews.
- A clear-eyed statement of what the system **cannot** do.

**Sample feedback he would give on a slide:**
> "Okay — I like the architecture. The 30-day baseline-per-user approach is sensible, and putting feature extraction on the device is the right call. But on slide 7 you write 'AI detects deterioration'. That's the wrong word. Tell me which features, tell me on what cohort you saw a signal, and tell me what your false-positive rate is at the threshold you've picked for the relative-facing alert. And — one more thing — your purpose-of-use statement. The EU AI Act distinguishes by *intended purpose*, not by what your sensor measures. If your interface to the relative reads 'consider seeing a doctor', you are in a different regulatory class than if it reads 'her walking pattern has changed'. Be precise about which one you are."

**Things he will NOT do:**
- Get hostile.
- Use jargon to intimidate.
- Praise without specifying what he liked.
- Forget the relative-user perspective once the team mentions it — he will return to it.

## Sources

- ESR AI Blog interview: https://www.myesr.org/ai-blog/on-artificial-intelligence-an-interview-with-daniel-truhn/
- RWTH press / SAGMA interview ("Where Medicine and AI Converge"): https://www.rwth-aachen.de/cms/root/wir/aktuell/pressemitteilungen/september-2025/europaeischer-forschungsrat-foerdert-zwe/~bpkxsh/die-symbiose-von-medizin-und-ki/?lidx=1
- AC-forscht SAGMA announcement: https://ac-forscht.de/erc-starting-grant-fuer-univ-prof-dr-med-dipl-phys-daniel-truhn-m-sc
- RWTH LfB team page: https://www.lfb.rwth-aachen.de/de/institute/team/truhn/ and https://www.lfb.rwth-aachen.de/en/institute/team/truhn/
- Uniklinik AI in Medicine lab: https://www.ukaachen.de/kliniken-institute/klinik-fuer-diagnostische-und-interventionelle-radiologie/forschung/labor-fuer-kuenstliche-intelligenz-in-der-medizin/
- ODELIA consortium / UKA: https://odelia.ai/consortium/uka/
- StratifAI announcement (LinkedIn): https://www.linkedin.com/posts/daniel-truhn-03a315287_stratifai-raises-15m-in-pre-seed-funding-activity-7236377768341504001-xBF0
- Google Scholar profile: https://scholar.google.com/citations?user=dlbH2gMAAAAJ
- Autonomous AI agent for oncology decision-making (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC12380607/
- Encrypted federated learning for cancer image analysis (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC10804934/
- "Navigating the EU AI Act for Healthcare" (npj Digital Medicine, PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC11319791/
- AI-ready Healthcare podcast episode (Spotify): https://creators.spotify.com/pod/profile/anirban-mukhopadhyay7/episodes/Daniel-Truhn-LLMs-can-perform-Radiology-Reporting-e2s6m1d
- ECR 2024 ODELIA interview (YouTube link only): https://www.youtube.com/watch?v=9MfLmTXlG2w
- LinkedIn: https://www.linkedin.com/in/daniel-truhn-03a315287/ (not directly fetchable)
- ORCID: https://orcid.org/0000-0002-9605-0728
