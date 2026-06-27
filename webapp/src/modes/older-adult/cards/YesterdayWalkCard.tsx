import { Card } from "../../../shared/Card";
import { placeLabel } from "../../../shared/labels";
import type { WalkSummary } from "../../../shared/types";

interface Props {
  walk: WalkSummary | null;
}

export function YesterdayWalkCard({ walk }: Props) {
  if (!walk) {
    return (
      <Card>
        <p className="text-lg">Heute noch nicht draußen. Das ist in Ordnung.</p>
      </Card>
    );
  }
  const km = (walk.distance_m / 1000).toFixed(2).replace(".", ",");
  const unique = Array.from(new Set(walk.place_labels.map(placeLabel)));
  const places = unique.join(" und ");
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">
        Gestern unterwegs
      </p>
      <p className="text-hero font-semibold mt-2">{km} km</p>
      {places && <p className="text-lg text-warm-800/80 mt-1">über {places}</p>}
    </Card>
  );
}
