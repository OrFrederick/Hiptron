import { useNavigate } from "react-router-dom";

import { useRelativePatterns } from "../../shared/api";
import { Card, SectionLabel, SlimNavyHeader } from "../../shared/kit";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import { DeltaRow, RhythmBars, RoutineBar } from "../../shared/charts";

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

      {data.monthly_deltas.length > 0 && (
        <>
          <SectionLabel>Verglichen mit letztem Monat</SectionLabel>
          <Card style={{ padding: "4px 20px" }}>
            {data.monthly_deltas.map((d) => (
              <DeltaRow key={d.feature} label={d.label} pct={d.pct_delta} direction={d.direction} />
            ))}
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
