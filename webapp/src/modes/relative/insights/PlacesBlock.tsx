import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function PlacesBlock({ block }: { block: InsightBlock }) {
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        {block.question}
      </p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {block.series.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex-1">
              {String(row.label ?? row.date ?? "—")}
            </span>
            <span className="bg-moss-400/40 px-2 py-1 rounded text-sm">
              {String(row.count ?? row.value ?? "")}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
