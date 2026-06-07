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

export function OutingsBlock({ block }: { block: InsightBlockData }) {
  const data = block.series.map((row) => ({
    date: String(row.date).slice(5),
    value: Number(row.value),
    baseline: Number(row.baseline),
  }));
  const baseline = data[0]?.baseline ?? 0;
  return (
    <InsightBlock question={block.question} verdict={block.verdict}>
      <div style={{ height: 160 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" tick={{ fill: "#6B7686", fontSize: 12 }} />
            <YAxis hide />
            <Bar dataKey="value" fill="#1F5FE0" radius={[5, 5, 0, 0]} isAnimationActive={false} />
            {baseline > 0 && (
              <ReferenceLine y={baseline} stroke="#6B7686" strokeDasharray="3 3" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </InsightBlock>
  );
}
