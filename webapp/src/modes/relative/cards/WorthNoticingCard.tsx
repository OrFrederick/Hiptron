import { Card } from "../../../shared/kit";
import type { WorthNoticing } from "../../../shared/types";

interface Props {
  item: WorthNoticing;
  onDetails: () => void;
}

export function WorthNoticingCard({ item, onDetails }: Props) {
  return (
    <Card style={{ border: "2px solid #F2B705", background: "#FFFCF2" }}>
      <p className="text-amber-600 text-sm uppercase tracking-wide mb-1 font-semibold">
        Beobachtung
      </p>
      <p className="text-[17px] font-medium leading-snug text-ink">
        {item.headline}
      </p>
      <p className="text-ink-muted text-sm mt-2">{item.detail}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onDetails}
          className="rounded-2xl bg-ink px-4 py-2 text-white text-sm font-semibold cursor-pointer"
        >
          Details
        </button>
      </div>
    </Card>
  );
}
