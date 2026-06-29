import { useNavigate } from "react-router-dom";

import { WeekBars } from "../../shared/charts";
import { useOlderAdultHome } from "../../shared/api";
import { Ic } from "../../shared/Icon";
import {
  Card,
  HeroCard,
  SectionLabel,
} from "../../shared/kit";
import { kmLabel } from "../../shared/labels";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
import { useEmbed } from "../../shared/embed";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import type { Highlight } from "../../shared/types";
import { MotivationCard } from "./cards/MotivationCard";

const c = HIP.c;
const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function OlderAdultHome() {
  const userId = usePersona();
  const embed = useEmbed();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOlderAdultHome(userId);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const name = personaName(userId);
  const week = data.week_distances;
  const e = embed ? "&embed=1" : "";
  const goProfile = () => navigate(`/profil?u=${userId}&m=older${e}`);

  return (
    <Shell active="home" mode="older">
      {!embed && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
          <PersonaSwitcher />
        </div>
      )}

      <HeroCard
        greeting={`${data.greeting},`}
        name={name}
        statusText={data.status === "amber" ? "Etwas ruhiger zur Zeit" : "In Ordnung"}
        tagline=""
        avatar={name}
        onProfile={goProfile}
      />

      <MotivationCard status={data.status} />

      {week && (
        <>
          <SectionLabel>Wochenübersicht</SectionLabel>
          <Card>
            <div style={{ fontSize: 17, color: c.textDark, lineHeight: 1.5 }}>
              {(() => {
                const activeDays = week.points.filter((p) => p.value > 0).length;
                const avgM =
                  week.points.length > 0
                    ? week.points.reduce((sum, p) => sum + p.value, 0) / week.points.length
                    : 0;
                const avg = kmLabel(avgM);
                return `An ${activeDays} von ${week.points.length} Tagen unterwegs · im Schnitt ${avg.value} ${avg.unit} am Tag.`;
              })()}
            </div>
          </Card>
        </>
      )}

      <SectionLabel>Monatsübersicht</SectionLabel>
      <Card>
        {week && week.points.length > 0 ? (
          <>
            <WeekBars
              big
              data={week.points.map((p) => p.value / 1000)}
              days={week.points.map((p) => WEEKDAYS_DE[new Date(p.date).getDay()] ?? "")}
              baseline={week.baseline_mean / 1000}
              baselineLabel={`Monatsschnitt · ${kmLabel(week.baseline_mean).value} ${kmLabel(week.baseline_mean).unit}`}
            />
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 10, textAlign: "center" }}>
              Balken = ein Tag · gestrichelt = Monatsschnitt
            </div>
          </>
        ) : (
          <div style={{ fontSize: 16, color: c.textMuted }}>Noch nicht genug Daten.</div>
        )}
      </Card>

      {data.highlight && (
        <>
          <SectionLabel>Dein längster Spaziergang diese Woche</SectionLabel>
          <HighlightCard highlight={data.highlight} />
        </>
      )}
    </Shell>
  );
}

function HighlightCard({ highlight }: { highlight: Highlight }) {
  const icon =
    highlight.kind === "new_place"
      ? "pin"
      : highlight.kind === "furthest"
        ? "route"
        : "walk";
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72 }}>
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: c.green50,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ic name={icon} size={22} color={c.green600} sw={2} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.textDark, lineHeight: 1.3 }}>
          {highlight.text}
        </div>
        {highlight.detail && (
          <div style={{ fontSize: 18, color: c.textMuted, marginTop: 4, lineHeight: 1.3 }}>
            {highlight.detail}
          </div>
        )}
      </div>
    </Card>
  );
}
