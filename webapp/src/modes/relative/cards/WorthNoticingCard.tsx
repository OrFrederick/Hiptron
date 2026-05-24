import { Card } from "../../../shared/Card";
import { Sentence } from "../../../shared/Sentence";
import type { WorthNoticing } from "../../../shared/types";

interface Props { item: WorthNoticing; }

export function WorthNoticingCard({ item }: Props) {
  return (
    <Card className="border-amber-500 border-2">
      <p className="text-amber-500 text-sm uppercase tracking-wide mb-1">Worth noticing</p>
      <Sentence text={item.headline} className="font-medium" />
      <p className="text-warm-800/80 text-sm mt-2">{item.detail}</p>
      <div className="flex gap-2 mt-3">
        <button className="rounded-2xl bg-warm-200 px-4 py-2 text-warm-800">
          See details
        </button>
        <button className="rounded-2xl border border-warm-200 px-4 py-2 text-warm-800">
          Mute 7 days
        </button>
      </div>
    </Card>
  );
}
