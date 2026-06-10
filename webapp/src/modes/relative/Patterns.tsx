import { useNavigate } from "react-router-dom";

import { useRelativePatterns } from "../../shared/api";
import { Card, SectionLabel, SlimNavyHeader } from "../../shared/kit";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import { DeltaRow, PauseStat, RhythmBars, RoutineBar, SpeedTrendLine, TimeOutdoorsStat } from "../../shared/charts";

const c = HIP.c;

export default function Patterns() {
  const userId = usePersona();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRelativePatterns(userId);

  if (isLoading) return <LoadingState text="Lädt…" />;
  if (isError || !data) return <ErrorState />;

  const name = personaName(userId);

  return (
    <Shell active="stats" mode="relative">
      <SlimNavyHeader title="Rückblick & Muster" onBack={() => navigate(`/relative?u=${userId}`)} />

      {data.highlights.length > 0 && (
        <>
          <SectionLabel>Höhepunkte</SectionLabel>
          <Card>
            {data.highlights.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  minHeight: 48,
                  borderBottom: i < data.highlights.length - 1 ? `1px solid ${c.line}` : "none",
                  paddingTop: i === 0 ? 0 : 10,
                  paddingBottom: i < data.highlights.length - 1 ? 10 : 0,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: c.textDark, flex: 1, lineHeight: 1.3 }}>
                  {h.text}
                </div>
                {h.detail && (
                  <div style={{ fontSize: 14, color: c.textMuted, marginLeft: 12, textAlign: "right", flexShrink: 0, maxWidth: "40%" }}>
                    {h.detail}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {data.rhythm && (
        <>
          <SectionLabel>{`Wann ${name} unterwegs ist`}</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
              {data.rhythm.sentence}
            </div>
            <RhythmBars buckets={data.rhythm.buckets} />
          </Card>
        </>
      )}

      {data.time_outdoors && (
        <>
          <SectionLabel>Zeit draußen</SectionLabel>
          <Card>
            <div style={{ marginBottom: 12 }}>
              <TimeOutdoorsStat avgMin={data.time_outdoors.avg_min_per_day} direction={data.time_outdoors.direction} />
            </div>
            <div style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.4 }}>
              {data.time_outdoors.sentence}
            </div>
          </Card>
        </>
      )}

      {data.walking_speed && (
        <>
          <SectionLabel>Tempo</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
              {data.walking_speed.sentence}
            </div>
            <SpeedTrendLine points={data.walking_speed.weekly} />
          </Card>
        </>
      )}

      {data.pauses && (
        <>
          <SectionLabel>Pausen unterwegs</SectionLabel>
          <Card>
            <div style={{ marginBottom: 12 }}>
              <PauseStat avg={data.pauses.avg_pauses_per_walk} direction={data.pauses.direction} />
            </div>
            <div style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.4 }}>
              {data.pauses.sentence}
            </div>
          </Card>
        </>
      )}

      {data.walk_fade && (
        <>
          <SectionLabel>Innerhalb eines Spaziergangs</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.4 }}>
              {data.walk_fade.sentence}
            </div>
          </Card>
        </>
      )}

      {data.monthly_deltas.length > 0 && (
        <>
          <SectionLabel>Verglichen mit letztem Monat</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
              Zahlen können von Monat zu Monat schwanken. Das ist ganz normal.
            </div>
            <div style={{ margin: "0 -4px" }}>
              {data.monthly_deltas.map((d) => (
                <DeltaRow key={d.feature} label={d.label} pct={d.pct_delta} direction={d.direction} />
              ))}
            </div>
          </Card>
        </>
      )}

      {data.routine && (
        <>
          <SectionLabel>Rhythmus-Stabilität</SectionLabel>
          <Card>
            <div style={{ fontSize: 15, color: c.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
              {data.routine.sentence}
            </div>
            <RoutineBar score={data.routine.score} band={data.routine.band} />
          </Card>
        </>
      )}

      <div style={{ textAlign: "center", fontSize: 13.5, color: c.textMuted, lineHeight: 1.5, marginTop: 2, marginBottom: 4 }}>
        {name} teilt diese Einblicke mit dir.
      </div>
    </Shell>
  );
}
