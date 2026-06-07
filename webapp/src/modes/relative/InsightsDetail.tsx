import { useNavigate } from "react-router-dom";

import { useRelativeInsights } from "../../shared/api";
import { SlimNavyHeader } from "../../shared/kit";
import { personaName, usePersona } from "../../shared/persona";
import { Shell } from "../../shared/Shell";
import { ErrorState, LoadingState } from "../../shared/states";
import { HIP } from "../../shared/theme";
import type { InsightBlock } from "../../shared/types";
import { ChangepointsBlock } from "./insights/ChangepointsBlock";
import { DistanceBlock } from "./insights/DistanceBlock";
import { OutingsBlock } from "./insights/OutingsBlock";
import { PlacesBlock } from "./insights/PlacesBlock";
import { RoutineBlock } from "./insights/RoutineBlock";

const c = HIP.c;

export default function InsightsDetail() {
  const userId = usePersona();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRelativeInsights(userId);

  if (isLoading) return <LoadingState text="Lädt…" />;
  if (isError || !data) return <ErrorState />;

  const name = personaName(userId);

  return (
    <Shell active="statistik">
      <SlimNavyHeader title="Einblicke" onBack={() => navigate(`/relative?u=${userId}`)} />

      {data.blocks
        .filter((b) => !b.hidden)
        .map((b) => (
          <BlockFor key={b.question} block={b} />
        ))}

      <div style={{ textAlign: "center", fontSize: 13.5, color: c.textMuted, lineHeight: 1.5, marginTop: 2, marginBottom: 4 }}>
        {name} teilt diese Einblicke mit dir.
      </div>
    </Shell>
  );
}

function BlockFor({ block }: { block: InsightBlock }) {
  if (block.feature === "total_distance_m")
    return <DistanceBlock block={block} />;
  if (block.feature === "activity_radius_m")
    return <RoutineBlock block={block} />;
  if (block.feature === "n_outings") return <OutingsBlock block={block} />;
  if (block.feature === "place_count") return <PlacesBlock block={block} />;
  if (block.chart_kind === "list") return <ChangepointsBlock block={block} />;
  return null;
}
