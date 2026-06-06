import { Link } from "react-router-dom";

import { useRelativeInsights } from "../../shared/api";
import { usePersona } from "../../shared/persona";
import type { InsightBlock } from "../../shared/types";
import { ChangepointsBlock } from "./insights/ChangepointsBlock";
import { DistanceBlock } from "./insights/DistanceBlock";
import { FatigueBlock } from "./insights/FatigueBlock";
import { PlacesBlock } from "./insights/PlacesBlock";
import { RoutineBlock } from "./insights/RoutineBlock";

export default function InsightsDetail() {
  const userId = usePersona();
  const { data, isLoading } = useRelativeInsights(userId);
  if (isLoading || !data) return <p className="p-6">Lädt…</p>;

  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <Link to={`/relative?u=${userId}`} className="text-warm-800/70 text-sm">
        ← zurück
      </Link>
      {data.blocks
        .filter((b) => !b.hidden)
        .map((b) => (
          <BlockFor key={b.question} block={b} />
        ))}
    </main>
  );
}

function BlockFor({ block }: { block: InsightBlock }) {
  if (block.feature === "total_distance_m")
    return <DistanceBlock block={block} />;
  if (block.feature === "activity_radius_m")
    return <RoutineBlock block={block} />;
  if (block.feature === "fatigue_index") return <FatigueBlock block={block} />;
  if (block.feature === "place_count") return <PlacesBlock block={block} />;
  if (block.chart_kind === "list") return <ChangepointsBlock block={block} />;
  return null;
}
