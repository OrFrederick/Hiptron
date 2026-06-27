import { PlaceBars, TrendPill, trendFromVerdict } from "../../../shared/charts";
import { InsightCard } from "../../../shared/kit";
import { placeLabel } from "../../../shared/labels";
import { HIP } from "../../../shared/theme";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

const c = HIP.c;

export function PlacesBlock({ block }: { block: InsightBlockData }) {
  const places = block.series
    .map((row) => ({
      label: placeLabel(String(row.label ?? "")),
      count: Number(row.count ?? row.value ?? 0),
    }))
    .filter((p) => p.count > 0);
  const trend = trendFromVerdict(block.verdict);
  return (
    <InsightCard label="Orte" headline={block.verdict} pill={trend && <TrendPill trend={trend} />}>
      {places.length > 0 ? (
        <PlaceBars places={places} />
      ) : (
        <div style={{ fontSize: 15.5, color: c.textMuted, lineHeight: 1.5 }}>
          Noch keine festen Orte erkennbar.
        </div>
      )}
    </InsightCard>
  );
}
