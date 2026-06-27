import { useNavigate, useSearchParams } from "react-router-dom";

import { useEmbedSuffix } from "./embed";
import { Ic } from "./Icon";
import { Avatar, Card, SlimNavyHeader } from "./kit";
import { personaName, usePersona } from "./persona";
import { Shell } from "./Shell";
import { HIP, type IconName } from "./theme";

const c = HIP.c;

// Profil & Privatsphäre — the data/consent surface every persona can reach
// (avatar, settings gear, Profil tab all land here). Plain German, honest about
// what the app sees and does not see; controls respond rather than sit dead.
export default function ProfileScreen() {
  const userId = usePersona();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("m") === "relative" ? "relative" : "older";
  const name = personaName(userId);
  const e = useEmbedSuffix();

  const back = () =>
    navigate(mode === "relative" ? `/relative?u=${userId}${e}` : `/older-adult?u=${userId}${e}`);

  return (
    <Shell active="profil" mode={mode}>
      <SlimNavyHeader title="Profil & Privatsphäre" onBack={back} />

      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={name} size={48} bg={c.navy700} color="#fff" />
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: c.textDark }}>{name}</div>
          <div style={{ fontSize: 14, color: c.textMuted, marginTop: 2 }}>
            {mode === "relative" ? "Angehörigen-Konto · Demo" : "Senior-Konto · Demo"}
          </div>
        </div>
      </Card>

      <InfoCard
        title="Was Hiptron sieht"
        rows={[
          { icon: "walk", tint: c.blue50, color: c.blue600, text: "Deine täglichen Geh-Muster: Strecke, Ausgänge, Orte" },
          { icon: "route", tint: c.green50, color: c.green600, text: "Deine Wege der letzten Tage auf der Karte" },
        ]}
      />

      <InfoCard
        title="Was Hiptron nicht tut"
        rows={[
          { icon: "heart", tint: c.chip, color: c.textMuted, text: "Keine medizinische Diagnose, keine Gesundheitswertung" },
          { icon: "shield", tint: c.chip, color: c.textMuted, text: "Keine Weitergabe an Dritte" },
        ]}
      />

      <div style={{ textAlign: "center", fontSize: 13.5, color: c.textMuted, lineHeight: 1.5, padding: "0 8px 4px" }}>
        Diese Daten bleiben bei dir. Du entscheidest, wer sie sieht.
      </div>
    </Shell>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: { icon: IconName; tint: string; color: string; text: string }[];
}) {
  return (
    <Card>
      <div style={{ fontSize: 18, fontWeight: 600, color: c.textDark, marginBottom: 8 }}>{title}</div>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            minHeight: 50,
            borderBottom: i === rows.length - 1 ? "none" : `1px solid ${c.line}`,
          }}
        >
          <span style={{ width: 36, height: 36, borderRadius: "50%", background: r.tint, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic name={r.icon} size={19} color={r.color} sw={2} />
          </span>
          <div style={{ flex: 1, fontSize: 15.5, color: c.textDark, lineHeight: 1.4 }}>{r.text}</div>
        </div>
      ))}
    </Card>
  );
}

