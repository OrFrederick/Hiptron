import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useRelativeInsights } from "../../shared/api";
import { Card } from "../../shared/Card";

export default function OlderAdultWeekView() {
  const { data } = useRelativeInsights("helga");
  const distanceBlock = data?.blocks.find(
    (b) => b.feature === "total_distance_m",
  );
  const points = (distanceBlock?.series ?? []).map((p) => ({
    date: String(p.date).slice(5),
    km: Number(p.value) / 1000,
  }));
  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <Link to="/older-adult" className="text-warm-800/70 text-sm">
        ← zurück
      </Link>
      <Card>
        <p className="text-warm-800/70 text-sm uppercase tracking-wide">
          Deine Woche
        </p>
        <div className="h-48 mt-3">
          <ResponsiveContainer>
            <BarChart data={points}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="km" fill="#4F7E5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-lg mt-3">
          Jeder Balken steht für die Gehstrecke eines Tages, in Kilometern.
        </p>
      </Card>
    </main>
  );
}
