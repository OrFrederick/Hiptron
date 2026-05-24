import { Link } from "react-router-dom";

import { useRelativeInsights } from "../../shared/api";
import type { InsightBlock } from "../../shared/types";
import { ChangepointsBlock } from "./insights/ChangepointsBlock";
import { DistanceBlock } from "./insights/DistanceBlock";
import { FatigueBlock } from "./insights/FatigueBlock";
import { PlacesBlock } from "./insights/PlacesBlock";
import { RoutineBlock } from "./insights/RoutineBlock";

export default function InsightsDetail() {
  const { data, isLoading } = useRelativeInsights();
  if (isLoading || !data) return <p className="p-6">Loading…</p>;

  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <Link to="/relative" className="text-warm-800/70 text-sm">← back</Link>
      {data.blocks
        .filter((b) => !b.hidden)
        .map((b) => (
          <BlockFor key={b.question} block={b} />
        ))}
    </main>
  );
}

function BlockFor({ block }: { block: InsightBlock }) {
  if (block.question.includes("How far")) return <DistanceBlock block={block} />;
  if (block.question.includes("routine")) return <RoutineBlock block={block} />;
  if (block.question.includes("harder")) return <FatigueBlock block={block} />;
  if (block.question.includes("Where")) return <PlacesBlock block={block} />;
  if (block.question.includes("change-points")) return <ChangepointsBlock block={block} />;
  return null;
}
