import { Card } from "../../../shared/Card";
import type { WalkSummary } from "../../../shared/types";

interface Props {
  walk: WalkSummary | null;
}

export function YesterdayWalkCard({ walk }: Props) {
  if (!walk) {
    return (
      <Card>
        <p className="text-lg">No outdoor time yet today — that&apos;s okay.</p>
      </Card>
    );
  }
  const km = (walk.distance_m / 1000).toFixed(2);
  const places = walk.place_labels.join(" and ");
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        Yesterday&apos;s walk
      </p>
      <p className="text-hero font-semibold mt-2">{km} km</p>
      {places && <p className="text-lg text-warm-800/80 mt-1">via {places}</p>}
    </Card>
  );
}
