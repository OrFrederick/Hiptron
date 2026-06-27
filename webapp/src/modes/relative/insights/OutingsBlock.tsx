import { TrendArea, TrendPill, trendFromVerdict } from "../../../shared/charts";
import { InsightCard } from "../../../shared/kit";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

export function OutingsBlock({ block }: { block: InsightBlockData }) {
  const points = block.series.map((row) => ({ date: String(row.date), value: Number(row.value) }));
  const baseline = Number(block.series[0]?.baseline ?? 0);
  const trend = trendFromVerdict(block.verdict);
  return (
    <InsightCard label="Ausgänge" headline={block.verdict} pill={trend && <TrendPill trend={trend} />}>
      <TrendArea points={points} baseline={baseline} fmt={(v) => `${Math.round(v)}`} baselineLabel="üblich" />
    </InsightCard>
  );
}
