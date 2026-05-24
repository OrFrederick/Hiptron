import {
  Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis,
} from "recharts";

import { Card } from "../../../shared/Card";
import { Sentence } from "../../../shared/Sentence";
import type { WeeklyTrend } from "../../../shared/types";

interface Props { trend: WeeklyTrend; }

export function WeeklyTrendCard({ trend }: Props) {
  const data = trend.points.map((p) => ({
    date: String(p.date).slice(5),
    value: p.value,
  }));
  return (
    <Card>
      <Sentence text={trend.headline} className="font-medium mb-3" />
      <div className="h-40">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis hide />
            <Bar dataKey="value" fill="#7BA688" radius={[4, 4, 0, 0]} />
            <ReferenceLine
              y={trend.baseline_mean}
              stroke="#3D2F22"
              strokeDasharray="3 3"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-warm-800/60 mt-2">
        Bars = daily distance. Dashed line = 4-week average.
      </p>
    </Card>
  );
}
