# Claude-Design-Prompt — Hiptron Pitch: NEUES INTRO „Alles wird smart"

> In Claude (Design / Artifact) einfügen. Erzeugt **5 neue Folien (Sektionen)**, die VOR die bestehende Hook-Folie „Smarte Rollatoren" gehören.
> **Aktueller Pitch (Stand der Wahrheit):** das gebaute Navy/Gold-Deck — `webapp/public/pitch.html` bzw. Export `Hiptron Pitch.pdf` (14 Folien: Hook „DER BLINDE FLECK · Smarte Rollatoren" → Problem → Lösung → Angehörige → Seniorin → Markt → Roadmap → Abschluss → Quellen → Live-Demo). Voller Skript-Kontext: `docs/pitch/pitch-script-de.md`.
> Geprüft von 3 Personas (Pitch-Coach · skeptischer Medizin-KI-Juror · Bühnen-/Motion-Lead) — Begründungen am Ende.

---

## Worum es geht (Kontext für dich, nicht auf die Folien)

Aktuell startet das Deck **kalt** auf „Smarte Rollatoren" — die Pointe ist in der ersten Sekunde verbrannt. Wir wollen einen **kurzen Aufbau davor** (~25 Sekunden), der ein Muster setzt — *jeder kennt sein smartes Gerät* — und es dann **subvertiert**: Smart war nie das Gerät, sondern was die Daten **versteht**.

**Rollen — verbindlich, niemals verwischen:**
- **Hiptron** (unser **Challenge-Geber**) = die **Hardware**: ein nachrüstbares **Sensor-Modul am Rollator**, das die **Position** aufzeichnet. *Rohe Punkte.*
- **Unser Team** = die **Mustererkennung** darüber: aus Wochen Bewegung werden **Frühsignale** nachlassender Mobilität — sichtbar für Angehörige, ermutigend für die Senior:innen. **Das ist der smarte Teil. Der ist von uns.**

**Wir haben den Rollator NICHT smart gemacht.** Der Sensor ist Hiptrons. Unser Beitrag ist die Intelligenz auf den Daten. Genau diese Trennung ist die Pointe des Intros — und ehrlicher als jeder „smarter-Rollator"-Gag. **Kein Medizinprodukt, keine Diagnose, kein Sturzalarm, keine Überwachung.**

---

## ⚠️ Graph-Regel (gilt für JEDE Kurve im Deck — wichtig)

Frühere Kurven lasen sich wie **Sturzerkennung** (Jury-Feedback) → unbedingt vermeiden. Eine Trend-/Bewegungskurve mit Knickpunkt **niemals** so zeigen: kein steiler **Absturz** der Linie, kein Marker-Label **„Sturz"**, keine Caption **„Klinik / Heim / bricht ein"**, keine vertikale Alarm-Linie als „Detektion". Stattdessen: **schleichender, sanfter Rückgang**; der goldene Marker heißt neutral **„Veränderung"** und steht für *früh sichtbar* — Botschaft: *„solange noch Zeit bleibt"*. Kein akutes Ereignis, keine Prognose. (Die Problem-Folie im Deck wurde bereits entsprechend entschärft.)

---

## ⚠️ Technische Pflicht (sonst bricht der Aufbau)

Der Renderer (`deck-stage.js`) hat **keine In-Slide-Fragmente** — pro Klick wird **eine ganze `<section>`** weitergeschaltet. Der schrittweise Aufbau wird daher als **5 gestapelte `<section>`-Elemente** gebaut (jede wiederholt die vorherigen Zeilen, fügt eine hinzu). Einstiegs-Animation immer auf `section[data-deck-active]` scopen. **Keine** Fragment-API, **keine** Loop-Animationen.

---

## Stil-Tokens (an bestehendes Deck angleichen — verbindlich)

| Token | Wert |
|---|---|
| Hintergrund (alle 5) | `linear-gradient(165deg,#0E2A47 0%,#163B66 100%)` |
| Text | `#FFFFFF` |
| Gold-Akzent | `#F2B705` |
| Kicker | 24px / 700 / `#F2B705`, `letter-spacing:0.18em`, `text-transform:uppercase` |
| H2 (Headline) | 92px / 700 / `letter-spacing:-0.025em` |
| Zeilen-Label | 44px / 600 / weiß |
| Muster-/Thesen-Zeile | 56px / 700 |
| Padding | `96px 120px` |
| Schrift | system-sans (`-apple-system, system-ui, …`) |

Viel Weißraum. Rechtes Drittel der Folie bewusst leer. Pro Folie **ein** Gold-Fokus. Keine Kästen um Icons.

---

## Erzähl-Bogen (warum es funktioniert)

1. **Aufbau (3×):** Geräte, die alle wörtlich „Smart-X" wurden → Publikum erwartet „smarter Rollator".
2. **These (§3):** *Smart war nie das Gerät — smart ist, was die Daten versteht.* Reframt den ganzen Aufbau: die Smartwatch ist nicht wegen des Sensors klug, sondern weil etwas die Daten liest.
3. **Wende (§4):** Der Rollator bekam tatsächlich einen Sensor — **von Hiptron**. Aber der kennt nur die **Position**: rohe Punkte. Noch nicht klug.
4. **Reveal (§5):** **Wir** lesen das Muster aus den Punkten → Bedeutung. Der Gold-Fokus wandert vom Sensor (Hiptrons) auf die **Kurve** (unsere). Das codiert die Rollenteilung visuell.
5. **Übergabe** in „Smarte Rollatoren": jetzt verstanden als *Sensor + Mustererkennung*, nicht als Gadget.

---

## Folien-für-Folien-Spec

Kicker `ALLES WIRD SMART` (gold, oben links) steht auf **allen 5** Sektionen.
Zentrales Raster (§1–3): linksbündig, `max-width:1120px`, vertikal zentriert. Jede Zeile = CSS-Grid `[Icon 120px] [Pfeil 72px] [Icon 120px] [Label]`, Zeilenhöhe ~150px, `row-gap:56px`. Nur die **neueste** Zeile animiert ein: `opacity:0→1, translateY(16px→0)`, 240ms ease-out.

| § | Auf der Folie | Gesprochen (Speaker-Note) |
|---|---|---|
| **1** | Zeile 1: `Uhr → Smartwatch` | „Die Uhr wurde zur Smartwatch — sie zählt nicht nur Schritte, sie versteht sie." |
| **2** | + Zeile 2: `Fernseher → Smart-TV` | „Der Fernseher zum Smart-TV." |
| **3** | + Zeile 3: `Telefon → Smartphone` **und** darunter die **Thesen-Zeile**: **„Smart war nie das Gerät — smart ist, was die Daten versteht."** (*„was die Daten versteht"* in Gold) | „Das Telefon zum Smartphone. Smart war nie der Sensor — smart ist, was die Daten versteht." |
| **4** | **Wende:** Raster weg. **Ein** Rollator-Icon mittig (Strich `#C9D4E2`), der **Hiptron-Sensor** schnappt ans obere Holm-Rohr (weiß/neutral, kleines Label `HIPTRON` daneben, 22px `#8FA3BC`). Darum verstreute **rohe Positionspunkte** (kleine Kreise `#5B708C`). Caption 40px `#8FA3BC`: „Hiptron kennt die Position. Rohe Punkte." | „Unser Challenge-Geber **Hiptron** bringt den Sensor an den Rollator. Der kennt die Position — rohe Punkte, sonst nichts." |
| **5** | **Reveal (unser Teil):** dieselben Punkte **verbinden sich** zu einer ruhigen **Bewegungs-Kurve**, die sanft abfällt, mit einem **goldenen Veränderungs-Marker** (`#F2B705`) am Knick — *das* ist jetzt der Gold-Fokus, nicht mehr der Sensor. **Kein steiler Absturz, kein „Sturz"** (siehe ⚠️ Graph-Regel). H2 unten links, 92px: **„Daraus machen wir Bedeutung."** | „**Wir** haben die Mustererkennung darübergebaut. Aus Wochen Bewegung werden Frühsignale — solange noch Zeit ist, etwas zu ändern." |

→ **Übergabe** direkt in die bestehende Folie **„Smarte Rollatoren"** (Kicker „Der blinde Fleck").
**Kleine Ergänzung an dieser bestehenden Folie:** ruhige Sub-Zeile unter der H2 — **„Mitdenken, nicht überwachen."** (28px, weiß, `opacity:.85`). Entschärft den Überwachungs-Reflex im Moment, in dem „smart" fällt.

**Gesamtdauer ~25 Sekunden. Sensor = Hiptron. Bedeutung = wir.**

---

## Animationen (genau zwei, sonst still)

**§4 — Snap-on** (Hiptron-Sensor ans Rohr). Scope `section[data-deck-active] .clip`:
```css
@keyframes snap {
  0%   { transform: translate(-56px,-28px) scale(.6); opacity:0; }
  70%  { transform: translate(0,0) scale(1.06);       opacity:1; }
  100% { transform: scale(1); }
}
/* 340ms cubic-bezier(.34,1.56,.64,1) */
```
Rohe Punkte erscheinen kurz danach (gestaffeltes `opacity 0→1`, ~60ms Versatz). Neutral, kein Gold.

**§5 — Punkte→Kurve** (der eigentliche Reveal, unser Teil). Die Punkte „verbinden" sich: eine SVG-Pfadlinie zeichnet sich per `stroke-dashoffset` (`length→0`, 700ms ease-out); der **goldene Knickpunkt** pulst einmal auf (`scale 1→1.3→1`, 480ms). Genau eine Zier. Keine Loops.

---

## Icon-/Asset-Set — Inline-SVG (bevorzugt; du kannst SVG direkt schreiben)

Einheitlicher Stil: **monoline, `stroke-width:2.5`, runde Caps/Joins, kein Fill, 120px-Box.**
„Alt"-Icons Weiß `#C9D4E2`. „Smart"-Icons = **dieselbe Silhouette + gemeinsames Gold-Signal-Motiv** (kleiner Signal-Bogen `((·))` oben rechts in `#F2B705`).

1. **Uhr** — rundes Zifferblatt, 2 Zeiger, 2 Bandansätze.
2. **Smartwatch** — Rounded-Rect-Gehäuse, Bandstummel, Gold-Signal-Bogen.
3. **Fernseher** — kastiges Gerät, Stummelbeine, V-Antenne.
4. **Smart-TV** — breites dünnes Panel auf Standfuß, Gold-Signal-Bogen.
5. **Telefon** — Wählscheiben-Hörer auf Basis.
6. **Smartphone** — hohes Rounded-Rect, Hörerschlitz, Gold-Signal-Bogen.
7. **Pfeil** — schlanker goldener Chevron-Pfeil (72px).
8. **Rollator** — Rahmen, 2 Vorderräder, Griffe, Sitz.
9. **Hiptron-Clip** — gerundeter Sensor-Pod (weiß/neutral in §4 — **Hiptrons** Hardware, NICHT der Gold-Held).
10. **Rohe Punkte** — 6–9 verstreute kleine Kreise `#5B708C` (Positions-Rohdaten).
11. **Bewegungs-Kurve** — ruhige SVG-Pfadlinie, die dieselben Punkte verbindet, mit **einem goldenen Knickpunkt-Marker** `#F2B705` (unser Teil — der Gold-Held in §5).

**Inline-SVG durchgängig.** Das echte Produktfoto (`webapp/public/pitch-assets/assets/rollator-sensor.png`) ist eine andere Bildsprache (rotes Frame auf hellgrau) und würde die monoline-Navy-Kohärenz im Aufbau brechen — **Foto erst als Auflösung auf der „Smarte Rollatoren"-Folie** danach.

---

## Falls Raster statt SVG (Fallback)

Gemeinsamer Stil-Prefix, sonst inkonsistent:
> „Minimalist monoline line-icon, single 2.5px stroke, rounded caps, no fill, transparent background, off-white stroke #C9D4E2, smart variants add one small gold `((·))` signal arc top-right in #F2B705, flat, no shadows — depicting: [Objekt]."
Objekte: analog wristwatch · smartwatch · CRT television · flat smart-TV on stand · rotary phone · smartphone · gold chevron arrow · rollator/walker frame · small neutral sensor clip pod · scattered raw GPS dots · a calm connected movement curve with one gold changepoint dot. **SVG klar bevorzugt.**

---

## NICHT tun

- **Niemals behaupten, WIR hätten den Rollator/Sensor smart gemacht.** Der Sensor ist **Hiptrons** (Challenge-Geber). Unser Teil ist die **Mustererkennung**. Diese Trennung ist die Pointe — nicht verwischen.
- „Update"/„smart" **nur** für die Geräte (Uhr/TV/Telefon), **nie** für den Rollator oder den Menschen.
- **Kein** Wort „Spielzeug"/„Gadget" — auch nicht zum Verneinen (pflanzt das Bild, das du vermeiden willst).
- §5-Gold gehört auf die **Kurve** (unser Teil), nicht auf den Sensor.
- Die Kurve **nicht** wie Sturzerkennung zeichnen — kein Absturz, kein „Sturz"/„Klinik"/„Heim" (siehe ⚠️ Graph-Regel oben).
- Variante mit Thermomix/Auto **nicht** verwenden: nicht „Smart-X" → die Wortpointe bricht; ein hype-allergischer Juror sieht die Naht.
- Kein Klinik-Blau, keine roten Alarm-Akzente, keine Risiko-Prozente.

---

## Warum so (Persona-Review, Kurzfassung)

- **Pitch-Coach:** Variante A (Smartwatch/Smart-TV/Smartphone) ist linguistisch dicht und vervollständigt exakt „Smarte Rollatoren". Dreiklang reicht; Objekt zeigen, Bedeutung sprechen.
- **Skeptischer Juror:** Der „Smart-X"-Dreiklang ist ein IoT-Klischee → Reflex „noch ein Gadget". Heilung = die These (§3) macht das Klischee **bewusst** zum Kontrast, und die ehrliche Rollenteilung (Hiptron = Sensor, wir = Bedeutung) ist genau das, was einen hype-allergischen Juror gewinnt. Würde-Zeile sofort, nicht erst spät. „Update" nie auf den Menschen.
- **Bühnen-Lead:** Renderer kennt keine Fragmente → 5 gestapelte Sektionen. Inline-SVG durchgängig, ein Snap-on (§4) + ein Punkte→Kurve-Zeichnen (§5), sonst still. §3 ist der dichteste Frame und bleibt mit 120px-Icons / 56px-Gaps luftig.
