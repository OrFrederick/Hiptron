import { useNavigate } from "react-router-dom";

import { useRelativeHome } from "../../shared/api";
import { Ic } from "../../shared/Icon";
import {
  ActivityRow,
  Card,
  MapCard,
  RelativeHeader,
  SectionLabel,
} from "../../shared/kit";
import { kmLabel, placeLabel, relativeTimeDe } from "../../shared/labels";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
import { useEmbed } from "../../shared/embed";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import type { RelativeHome as RelativeHomeData, WalkSummary } from "../../shared/types";
import { FooterPrivacyCard } from "./cards/FooterPrivacyCard";
import { WeeklyTrendCard } from "./cards/WeeklyTrendCard";
import { WorthNoticingCard } from "./cards/WorthNoticingCard";

const c = HIP.c;

function greetingDe(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function lastPlaceLabel(outings: WalkSummary[]): string | null {
  for (const o of outings) {
    const lbl = o.place_labels.at(-1);
    if (lbl) return placeLabel(lbl);
  }
  return null;
}

export default function RelativeHome() {
  const userId = usePersona();
  const embed = useEmbed();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRelativeHome(userId);

  if (isLoading) return <LoadingState text="Lädt…" />;
  if (isError || !data) return <ErrorState />;

  const name = personaName(userId);
  const e = embed ? "&embed=1" : "";
  const calm = data.status === "amber";
  const outings = data.recent_outings ?? [];
  const lastPlace = lastPlaceLabel(outings);
  const callout = lastPlace ? `Zuletzt · ${lastPlace}` : data.home_label;

  return (
    <Shell active="home" mode="relative">
      <RelativeHeader
        personaSlot={embed ? undefined : <PersonaSwitcher variant="navy" />}
        avatarName={name}
        greeting={greetingDe()}
        statusText={calm ? "Diese Woche etwas auffällig" : "Alles sieht gut aus"}
        tone={calm ? "amber" : "green"}
        subtext={data.summary}
        onProfile={() => navigate(`/profil?u=${userId}&m=relative${e}`)}
      />

      <SummaryRow data={data} lastPlace={lastPlace} />

      {data.schematic_map && (
        <MapCard
          map={data.schematic_map}
          avatar={name}
          callout={callout}
          onClick={() => navigate(`/relative/insights?u=${userId}${e}`)}
        />
      )}

      <WeeklyTrendCard trend={data.weekly_trend} />

      {data.worth_noticing && (
        <WorthNoticingCard
          item={data.worth_noticing}
          onDetails={() => navigate(`/relative/insights?u=${userId}${e}`)}
        />
      )}

      {outings.length > 0 && (
        <>
          <SectionLabel>Neueste Aktivitäten</SectionLabel>
          <Card style={{ padding: "4px 18px" }}>
            {outings.map((o, i) => {
              const km = kmLabel(o.distance_m);
              const places = Array.from(new Set(o.place_labels.map(placeLabel))).join(", ");
              return (
                <ActivityRow
                  key={o.walk_id}
                  icon="route"
                  text={places ? `Spaziergang über ${places}` : "Spaziergang"}
                  time={`${km.value} ${km.unit} · ${relativeTimeDe(o.end_ts)}`}
                  last={i === outings.length - 1}
                  onClick={() => navigate(`/relative/insights?u=${userId}${e}`)}
                />
              );
            })}
          </Card>
          <button
            onClick={() => navigate(`/relative/insights?u=${userId}${e}`)}
            style={{
              alignSelf: "center",
              background: "transparent",
              border: "none",
              color: c.blue600,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 44,
              padding: "0 12px",
            }}
          >
            Mehr anzeigen
          </button>
        </>
      )}

      <FooterPrivacyCard name={name} />
    </Shell>
  );
}

function SummaryRow({
  data,
  lastPlace,
}: {
  data: RelativeHomeData;
  lastPlace: string | null;
}) {
  const activeDays = data.weekly_trend.points.filter((p) => p.value > 0).length;
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1.7, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: c.green50, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic name={lastPlace ? "pin" : "house"} size={20} color={c.green600} sw={2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: c.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lastPlace ?? data.home_label}
            </div>
            <div style={{ fontSize: 13.5, color: c.textMuted, marginTop: 2 }}>
              zuletzt {relativeTimeDe(data.last_update)}
            </div>
          </div>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: c.line }} />
        <div style={{ flex: 0.9 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: c.textDark, fontVariantNumeric: "tabular-nums" }}>
              {activeDays}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: c.textMuted }}>
              /{data.weekly_trend.points.length}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: c.textMuted, marginTop: 2 }}>Tage aktiv</div>
        </div>
      </div>
    </Card>
  );
}
