import { PlaceBars } from "../../../shared/charts";
import { InsightBlock } from "../../../shared/kit";
import { placeLabel } from "../../../shared/labels";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

export function PlacesBlock({ block }: { block: InsightBlockData }) {
  const places = block.series
    .map((row) => ({
      label: placeLabel(String(row.label ?? "")),
      count: Number(row.count ?? row.value ?? 0),
    }))
    .filter((p) => p.count > 0);
  return (
    <InsightBlock question={block.question} verdict={block.verdict}>
      {places.length > 0 ? (
        <PlaceBars places={places} />
      ) : (
        <div style={{ fontSize: 15.5, color: "#6B7686", lineHeight: 1.5 }}>
          Noch keine festen Orte erkennbar.
        </div>
      )}
    </InsightBlock>
  );
}
