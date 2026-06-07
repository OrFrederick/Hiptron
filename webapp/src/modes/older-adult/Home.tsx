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

  return (
    <Shell active="home">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
        <PersonaSwitcher />
      </div>

      <SectionLabel style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, fontWeight: 700 }}>
        Meine Mobilität
      </SectionLabel>

      <HeroCard
        greeting={`${data.greeting},`}
        name={name}
        statusText="In Ordnung"
        tagline={evening ? "Ein ruhiger Abend — alles sieht gut aus." : "Heute schon alles im Grünen?"}
        avatar={name}
        rightSlot={
          <button
            aria-label="Einstellungen"
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
