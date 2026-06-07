import { useNavigate } from "react-router-dom";

import { useOlderAdultHome } from "../../shared/api";
import { PlaceBars, WeekBars } from "../../shared/charts";
import { BackButtonBig, Card, NavyLabel } from "../../shared/kit";
import { kmLabel, placeLabel } from "../../shared/labels";
import { usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";

const c = HIP.c;
const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default function OlderAdultWeekView() {
  const userId = usePersona();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOlderAdultHome(userId);

  if (isLoading) return <LoadingState text="Lade deine Woche…" />;
  if (isError || !data) return <ErrorState />;

  const week = data.week_distances;
  // Heuristic clustering can split one real spot across several place_ids; sum by label.
  const byLabel = new Map<string, number>();
  for (const p of data.schematic_map?.places ?? []) {
    const v = p.visits ?? 0;
    if (v <= 0) continue;
    const label = placeLabel(p.label);
    byLabel.set(label, (byLabel.get(label) ?? 0) + v);
  }
  const places = [...byLabel.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const baselineKm = kmLabel(week?.baseline_mean ?? 0);

  return (
    <Shell active="statistik">
      <BackButtonBig onBack={() => navigate(`/older-adult?u=${userId}`)} />

      <NavyLabel style={{ marginTop: 2, marginBottom: -2 }}>Meine Woche</NavyLabel>

      <Card style={{ padding: 22 }}>
        <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.01em", color: c.textDark }}>Deine Woche</div>
        <div style={{ fontSize: 18, color: c.textMuted, lineHeight: 1.5, marginTop: 8, marginBottom: 22 }}>
          Jeder Balken ist ein Tag — wie weit du unterwegs warst.
        </div>
        {week && week.points.length > 0 ? (
          <WeekBars
            big
            data={week.points.map((p) => p.value / 1000)}
            days={week.points.map((p) => WEEKDAYS_DE[new Date(p.date).getDay()] ?? "")}
            baseline={(week.baseline_mean ?? 0) / 1000}
            baselineLabel={`üblich · ${baselineKm.value} ${baselineKm.unit}`}
          />
        ) : (
          <div style={{ fontSize: 16, color: c.textMuted }}>Noch nicht genug Daten für diese Woche.</div>
        )}
      </Card>

      {places.length > 0 && (
        <>
          <NavyLabel style={{ marginTop: 4 }}>Wo du warst</NavyLabel>
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 18, color: c.textMuted, lineHeight: 1.5, marginBottom: 20 }}>
              Deine Orte in dieser Woche — wie oft du dort warst.
            </div>
            <PlaceBars big places={places} />
          </Card>
        </>
      )}
    </Shell>
  );
}
