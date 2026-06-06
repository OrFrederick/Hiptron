import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

const FEATURE_DE: Record<string, string> = {
  total_distance_m: "Gehstrecke",
  activity_radius_m: "Aktionsradius",
  fatigue_index: "Ermüdung",
  place_count: "Ortsvielfalt",
};
const DIRECTION_DE: Record<string, string> = {
  down: "gesunken",
  up: "gestiegen",
};

export function ChangepointsBlock({ block }: { block: InsightBlock }) {
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        {block.question}
      </p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      {block.series.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-warm-800/80">
          {block.series.map((row, i) => {
            const f = FEATURE_DE[String(row.feature)] ?? String(row.feature);
            const d = DIRECTION_DE[String(row.direction)] ?? String(row.direction);
            return (
              <li key={i}>
                {String(row.detected_at)} — {f} {d}: Mittelwert{" "}
                {Number(row.baseline_mean).toFixed(1)} →{" "}
                {Number(row.current_value).toFixed(1)}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
