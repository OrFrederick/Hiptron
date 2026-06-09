import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = () =>
    navigate(mode === "relative" ? `/relative?u=${userId}` : `/older-adult?u=${userId}`);

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
          { icon: "walk", tint: c.blue50, color: c.blue600, text: "Deine täglichen Geh-Muster — Strecke, Ausgänge, Orte" },
          { icon: "route", tint: c.green50, color: c.green600, text: "Eine ungefähre Route der letzten Runde" },
        ]}
      />

      <InfoCard
        title="Was Hiptron nicht tut"
        rows={[
          { icon: "pin", tint: c.chip, color: c.textMuted, text: "Keine Live-Ortung in Echtzeit" },
          { icon: "heart", tint: c.chip, color: c.textMuted, text: "Keine medizinische Diagnose, keine Gesundheitswertung" },
          { icon: "shield", tint: c.chip, color: c.textMuted, text: "Keine Weitergabe an Dritte" },
        ]}
      />

      <Card>
        <div style={{ fontSize: 18, fontWeight: 600, color: c.textDark, marginBottom: 4 }}>
          Deine Daten
        </div>
        <ActionRow
          label={paused ? "Standortverlauf pausiert" : "Standortverlauf pausieren"}
          sub={paused ? "Tippen zum Fortsetzen" : "Hiptron zeichnet vorübergehend nichts auf"}
          tone={paused ? "amber" : "default"}
          onClick={() => {
            setPaused((p) => !p);
            setNote(null);
          }}
        />
        <ActionRow
          label="Daten exportieren"
          sub="Alles, was Hiptron über dich gespeichert hat"
          onClick={() => setNote("Export wird vorbereitet — du bekommst eine Datei per E-Mail. (Demo)")}
        />
        <ActionRow
          label="Alle Daten löschen"
          sub="Endgültig und vollständig"
          tone="danger"
          last
          onClick={() => setConfirmDelete(true)}
        />
        {note && (
          <div style={{ marginTop: 12, fontSize: 14.5, color: c.green700, background: c.green50, borderRadius: 12, padding: "10px 13px", lineHeight: 1.45 }}>
            {note}
          </div>
        )}
        {confirmDelete && (
          <div style={{ marginTop: 12, background: "#FBECEC", borderRadius: 12, padding: "13px 14px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#9B2C2C", lineHeight: 1.45 }}>
              Wirklich alle Daten von {name} löschen?
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setNote("Alle Daten wurden gelöscht. (Demo — keine echten Daten betroffen.)");
                }}
                style={{ flex: 1, minHeight: 48, border: "none", borderRadius: 12, background: "#C0392B", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: HIP.font }}
              >
                Ja, löschen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, minHeight: 48, border: `1px solid ${c.line}`, borderRadius: 12, background: c.white, color: c.textDark, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: HIP.font }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ textAlign: "center", fontSize: 13.5, color: c.textMuted, lineHeight: 1.5, padding: "0 8px 4px" }}>
        Diese Daten bleiben bei dir. Du entscheidest, wer sie sieht — und kannst alles jederzeit löschen.
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

function ActionRow({
  label,
  sub,
  onClick,
  tone = "default",
  last,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  tone?: "default" | "danger" | "amber";
  last?: boolean;
}) {
  const fg = tone === "danger" ? "#C0392B" : tone === "amber" ? c.amber600 : c.textDark;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 60,
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : `1px solid ${c.line}`,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: HIP.font,
        padding: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16.5, fontWeight: 600, color: fg }}>{label}</div>
        <div style={{ fontSize: 13.5, color: c.textMuted, marginTop: 2 }}>{sub}</div>
      </div>
      <Ic name="chevron" size={18} color={c.textMuted} sw={2} />
    </button>
  );
}
