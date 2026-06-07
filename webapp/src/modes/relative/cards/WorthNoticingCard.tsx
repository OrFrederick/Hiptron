import { Card } from "../../../shared/kit";
import type { WorthNoticing } from "../../../shared/types";

interface Props {
  item: WorthNoticing;
}

export function WorthNoticingCard({ item }: Props) {
  return (
    <Card style={{ border: "2px solid #F2B705", background: "#FFFCF2" }}>
      <p className="text-amber-600 text-sm uppercase tracking-wide mb-1 font-semibold">
        Worth noticing
      </p>
      <p className="text-[17px] font-medium leading-snug text-ink">
        {item.headline}
      </p>
      <p className="text-ink-muted text-sm mt-2">{item.detail}</p>
      <div className="flex gap-2 mt-3">
        <button className="rounded-2xl bg-ink px-4 py-2 text-white text-sm font-semibold">
          Details
        </button>
        <button className="rounded-2xl border border-line px-4 py-2 text-ink text-sm font-semibold">
          7 Tage stummschalten
        </button>
      </div>
    </Card>
  );
}
