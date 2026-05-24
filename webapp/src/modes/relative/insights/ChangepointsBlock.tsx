import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function ChangepointsBlock({ block }: { block: InsightBlock }) {
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        {block.question}
      </p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      {block.series.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-warm-800/80">
          {block.series.map((row, i) => (
            <li key={i}>
              {String(row.detected_at)} — {String(row.feature)}{" "}
              {String(row.direction)}: baseline{" "}
              {Number(row.baseline_mean).toFixed(1)} →{" "}
              {Number(row.current_value).toFixed(1)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
