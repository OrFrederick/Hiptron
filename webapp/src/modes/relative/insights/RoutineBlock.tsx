import { TrendArea, TrendPill, trendFromVerdict } from "../../../shared/charts";
import { InsightCard } from "../../../shared/kit";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

export function RoutineBlock({ block }: { block: InsightBlockData }) {
  const points = block.series.map((p) => ({ date: String(p.date), value: Number(p.value) }));
  const baseline = Number(block.series[0]?.baseline ?? 0);
  const trend = trendFromVerdict(block.verdict);
  return (
    <InsightCard label="Aktionsradius" headline={block.verdict} pill={trend && <TrendPill trend={trend} />}>
      <TrendArea points={points} baseline={baseline} fmt={(v) => `${Math.round(v)} m`} />
    </InsightCard>
  );
}
