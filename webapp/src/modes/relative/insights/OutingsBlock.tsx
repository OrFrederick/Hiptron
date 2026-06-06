import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function OutingsBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((row) => ({
    date: String(row.date).slice(5),
    value: Number(row.value),
    baseline: Number(row.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        {block.question}
      </p>
      <p className="text-lg font-medium mt-1">{block.verdict}</p>
      <div className="h-40 mt-3">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Bar dataKey="value" fill="#7BA688" radius={[4, 4, 0, 0]} />
            {baseline > 0 && (
              <ReferenceLine
                y={baseline}
                stroke="#3D2F22"
                strokeDasharray="3 3"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-warm-800/60 mt-2">
        Balken = Ausgänge pro Tag. Gestrichelte Linie = Mittelwert.
      </p>
    </Card>
  );
}
