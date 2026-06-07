import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../../../shared/kit";
import type { WeeklyTrend } from "../../../shared/types";

interface Props {
  trend: WeeklyTrend;
}

export function WeeklyTrendCard({ trend }: Props) {
  const data = trend.points.map((p) => ({
    date: String(p.date).slice(5),
    value: p.value,
  }));
  return (
    <Card>
      <p className="text-[17px] font-medium leading-snug text-ink mb-3">
        {trend.headline}
      </p>
      <div className="h-40">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="date" tick={{ fill: "#6B7686", fontSize: 12 }} />
            <YAxis hide />
            <Bar dataKey="value" fill="#1F5FE0" radius={[5, 5, 0, 0]} />
            <ReferenceLine
              y={trend.baseline_mean}
              stroke="#6B7686"
              strokeDasharray="3 3"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-ink-muted mt-2">
        Balken = Tagesstrecke. Gestrichelte Linie = 4-Wochen-Mittelwert.
      </p>
    </Card>
  );
}
