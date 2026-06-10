import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { InsightBlock } from "../../../shared/kit";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

export function DistanceBlock({ block }: { block: InsightBlockData }) {
  const data = block.series.map((p) => ({
    date: String(p.date).slice(5),
    value: Number(p.value),
    baseline: Number(p.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <InsightBlock question={block.question} verdict={block.verdict}>
      <div style={{ height: 160 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "#6B7686", fontSize: 12 }} />
            <YAxis
              width={56}
              tick={{ fill: "#6B7686", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1).replace(".", ",")} km`}
              tickCount={4}
              domain={[0, (dataMax: number) => Math.max(300, Math.ceil(dataMax / 300) * 300)]}
            />
            <Bar dataKey="value" fill="#1F5FE0" radius={[5, 5, 0, 0]} isAnimationActive={false} />
            <ReferenceLine y={baseline} stroke="#6B7686" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </InsightBlock>
  );
}
