# Claude-Design-Prompt — Hiptron Pitch Deck

> Diesen Block in Claude (Design / Artifact) einfügen. Erzeugt ein durchgestyltes 10-Min-Pitch-Deck.
> Vollständiges Skript + verifizierte Quellen: `docs/pitch/pitch-script-de.md`.

---

## PROMPT (ab hier kopieren)

Du bist Pitch-Deck-Designer. Baue mir ein **durchgestyltes Präsentations-Deck** (HTML/Reveal.js-Artifact oder einzelne Folien-Designs) für einen **10-minütigen Startup-Pitch auf Deutsch**. 3 Sprecher, vor einer Fachjury. Keine Live-Demo — **Screenshots** als Platzhalter.

### Worum es geht
**Hiptron** ist ein nachrüstbares **Sensor-Modul am Rollator**, das die Position älterer Menschen aufzeichnet. **Unser Team** hat darauf die **Mustererkennung** gebaut: aus Bewegungsdaten werden Frühsignale für nachlassende Mobilität — sichtbar für Angehörige, ermutigend für die Senior:innen. Wir machen aus rohen Sensordaten Bedeutung.

### Marke & Ästhetik (sehr wichtig)
- **Würde statt Diagnose.** „Smarter Begleiter", nicht Überwachung, nicht Klinik. Ältere Person = Heldin, nicht Messobjekt.
- **Look: apothekarisch-minimal (Aesop-Tier).** Viel Weißraum, ruhige, warme Erd-/Sand-/Salbeitöne, **keine** grellen Health-Tech-Blaus, **keine** roten Alarm-Akzente. Elegante, gut lesbare Typo (humanistische Serif für Headlines + klare Sans für Text). Große, atmende Folien — wenig Text pro Folie.
- **Ton der Folientexte:** knapp, deutsch, menschlich. **Niemals** das Wort „Dienstleister", **niemals** Risiko-Prozente/Scores. Beobachtungen in Klartext.

### Jury (für Subtext, nicht auf Folien)
Medizin-KI-Professor (will Erklärbarkeit, MDR-Grenze, Validierung) · Regulated-AI-CTO (Adoption, Daten-Governance) · Sales-Coach · Change-/Customer-Success-Leute · Gründer (Marke, Anti-Überwachung). Das Deck soll erklärbar, ehrlich und würdevoll wirken — nicht hype-ig.

### Folienfolge (1 Beat ≈ 1 Folie; ~11 Folien)
1. **Titel** — „Hiptron" + eine ruhige Unterzeile (z. B. „Mobilität sichtbar machen — mit Würde"). Minimal.
2. **Hook** — große Frage: *„Wie viel bewegt sich deine Oma eigentlich?"* Variante/Unterzeile: *„Sie geht jeden Tag ihre Runde — niemand sieht, wenn die Runde kürzer wird."* Foto/Illustration ältere Person mit Rollator, warm.
3. **Problem & Einsatz** — eine große Zahl (Demografie, z. B. „+1,8 Mio. Pflegebedürftige bis 2055") + simple, langsam fallende Kurve „Mobilität sinkt schleichend". Stichworte: Pflege überlastet · Selbstständigkeit = Würde · Bewegung = Frühindikator. Win-win.
4. **Lösung & Rolle** — Render/Foto Modul am Rollator-Rohr → Pfeil → Karte mit Wegen. Kleine Fußzeile: **„Hiptron = Hardware · Wir = Mustererkennung"**. Nachrüstbar an jeden Rollator.
5. **Technik** — Pipeline als **5 Kästen mit Pfeilen**: Position → Spaziergänge → Merkmale (Strecke, Tempo, Pausen, Nachlassen) → Tagesaggregat → **Veränderung erkannt**. Daneben kleine Kurve mit markiertem **Knickpunkt**. Kernbotschaft: **„Erklärbar statt Black-Box"** — jede Person ihr eigener Normalwert, Alarm nur bei anhaltender, deutlicher Abweichung. Mini-Zusatz: *Messen (Zahl+Flag) ≠ Formulieren (Klartext-Template)*.
6. **Produkt — Sicht der Seniorin** — Screenshot-Platzhalter „Senioren-Home": warm, Tagesgruß, „Spaziergang gestern", Streak, 1 Highlight. Beschriftung: **keine Scores, keine Warnungen — Ermutigung.**
7. **Produkt — Sicht der Angehörigen** — Screenshot-Platzhalter „Angehörige-Home (Helga)": Status + 1-Satz-Summary + Leitfrage **„Gab es kürzlich Veränderungen?"** + ruhige Karte *„Helga geht zur Zeit kürzere Strecken als sonst — vorher ~3,2 km/Tag."* **Plus kleiner Consent-/Agency-Screenshot** (zugestimmt · sieht eigene Daten · kann abschalten) und Hinweis **„letzter Ausgang als Kontext, kein Live-Tracking"**. Beobachtung in Klartext, keine Risiko-Prozente.
8. **Produkt — Kennzahlen & Personas** — Screenshot-Platzhalter „Patterns", aber **brand-tiered, kein 16-Zellen-Klinikraster**: 3 ruhige Gruppen — **Mobilität** (Strecke, Radius, Ausgänge, Orte) · **Gangbild** (Tempo, Pausen, Nachlassen) · **Routine** (Rhythmus, Stabilität, Zeit draußen). Zwei Personas: **Helga** = Veränderung sichtbar, *solange noch Zeit ist, etwas zu ändern* (NICHT „bevor ein Sturz passiert"). **Ingrid** = wochenlange Entwarnung = Wert, wenn nichts passiert.
9. **Ehrlichkeit** — drei durchgestrichene Icons: **kein Sturzalarm · keine Diagnose · keine Überwachung**. Darunter knapp: Risiken + ehrlich „Demo auf synthetischen Personas, Pipeline echt, nächster Schritt: Pilot mit echten Nutzern".
10. **Markt & Ask** — Betroffenenzahlen ruhig gesetzt: ~2 Mio. Rollatoren · ~6 Mio. Ältere leben allein · 3,1 Mio. ausschließlich von Angehörigen versorgt. Eine Zeile Rolle: *Käufer sind Senioren & Angehörige — unser Fall ist die Mustererkennung.* **Ask:** ein Pilotpartner, 8-Wochen-Pilot, echte Daten + Co-Design mit Älteren. Abschluss-Callback: *„Wie viel bewegt sich deine Oma? — Mit Hiptron könntest du es wissen. Früh genug, um noch etwas zu ändern."* → „Würde. Selbstständigkeit. Ruhe für die Familie."
11. **Quellen (Backup)** — kleine Fußnoten-Folie: Studenski JAMA 2011 · Fritz/Lusardi 2009 · WHO Falls 2007 · Mackey 2014 · Holt-Lunstad 2010 · IANA 2009 · Destatis. (Volle Angaben im Skript.)

### Format & Output
- Liefere ein **einzelnes, sofort präsentierbares Artifact** (Reveal.js-HTML bevorzugt), 16:9, je Folie als eigene Section.
- **Sprecher-Notizen** je Folie (kurz, deutsch) aus den Stichworten oben.
- Screenshot-Platzhalter als saubere Rahmen mit Beschriftung (ich ersetze sie durch echte Screens).
- Konsistentes Farb-/Typo-System, ruhige Übergänge, kein Klinik-Look.

Frag mich, falls dir Marken-Assets (Logo, Farbwerte, echte Screenshots) fehlen — sonst wähle ein stimmiges, dezentes Set und beschrifte es als Platzhalter.

## (Prompt-Ende)
