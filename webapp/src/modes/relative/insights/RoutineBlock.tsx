import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../../../shared/Card";
import type { InsightBlock } from "../../../shared/types";

export function RoutineBlock({ block }: { block: InsightBlock }) {
  const data = block.series.map((p) => ({
    date: String(p.date).slice(5),
    value: Number(p.value),
    baseline: Number(p.baseline),
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
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Line
              dataKey="value"
              stroke="#4F7E5E"
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              y={baseline}
              stroke="#3D2F22"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
