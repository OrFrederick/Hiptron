import { useNavigate } from "react-router-dom";

import { useOlderAdultHome } from "../../shared/api";
import { Ic } from "../../shared/Icon";
import {
  Card,
  ChecklistRow,
  HeroCard,
  SectionLabel,
  StatCard,
} from "../../shared/kit";
import { kmLabel, durationMin } from "../../shared/labels";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import type { Highlight } from "../../shared/types";
import { FamilyNoteCard } from "./cards/FamilyNoteCard";
import { TrendCard } from "./cards/TrendCard";
import { SchematicMap } from "./SchematicMap";

const c = HIP.c;

export default function OlderAdultHome() {
  const userId = usePersona();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOlderAdultHome(userId);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const name = personaName(userId);
  const evening = data.greeting.includes("Abend");
  const walk = data.yesterday_walk;
  const km = walk ? kmLabel(walk.distance_m) : null;
  const hasStreak = data.streak_days > 0;

  const goProfile = () => navigate(`/profil?u=${userId}&m=older`);

  return (
    <Shell active="home" mode="older">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
        <PersonaSwitcher />
      </div>

      <SectionLabel style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, fontWeight: 700 }}>
        Mein Tag
      </SectionLabel>

      <HeroCard
        greeting={`${data.greeting},`}
        name={name}
        statusText="In Ordnung"
        tagline={evening ? "Ein ruhiger Abend — alles sieht gut aus." : "Heute schon alles im Grünen?"}
        avatar={name}
        onProfile={goProfile}
        rightSlot={
          <button
            aria-label="Einstellungen"
            onClick={goProfile}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "none",
              background: c.navyGlass,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ic name="settings" size={21} color="#fff" />
          </button>
        }
      />

      <Card>
        <div style={{ fontSize: 18, fontWeight: 600, color: c.textDark, marginBottom: 6 }}>
          Alles in Ordnung
        </div>
        <ChecklistRow icon="walk" tint={c.blue50} iconColor={c.blue600} label="Routine vorhanden" />
        <ChecklistRow
          icon="route"
          tint={c.green50}
          iconColor={c.green600}
          label={walk && km ? `${km.value} ${km.unit} gestern unterwegs` : "Heute ein ruhiger Tag"}
          last={!hasStreak}
        />
        {hasStreak && (
          <ChecklistRow
            icon="sun"
            tint={c.amber50}
            iconColor={c.amber600}
            label={`${data.streak_days} Tage in Folge draußen`}
            last
          />
        )}
      </Card>

      {walk && km && (
        <StatCard
          title="Bewegung"
          cells={[
            { value: km.value, unit: km.unit, label: "gestern unterwegs" },
            { value: String(durationMin(walk.start_ts, walk.end_ts)), unit: "min", label: "Spaziergang" },
          ]}
        />
      )}

      {data.highlight && <HighlightCard highlight={data.highlight} />}

      {data.schematic_map && (
        <SchematicMap
          map={data.schematic_map}
          onClick={() => navigate(`/older-adult/week?u=${userId}`)}
        />
      )}

      <FamilyNoteCard note={data.family_note} />
      <TrendCard text={data.trend_card} />
    </Shell>
  );
}

function HighlightCard({ highlight }: { highlight: Highlight }) {
  const icon = highlight.kind === "new_place" ? "pin" : highlight.kind === "furthest" ? "route" : "walk";
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72 }}>
      <span style={{ width: 46, height: 46, borderRadius: "50%", background: c.green50, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic name={icon} size={22} color={c.green600} sw={2} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.textDark, lineHeight: 1.3 }}>{highlight.text}</div>
        {highlight.detail && <div style={{ fontSize: 16, color: c.textMuted, marginTop: 3 }}>{highlight.detail}</div>}
      </div>
    </Card>
  );
}
