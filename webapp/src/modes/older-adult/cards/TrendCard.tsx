import { Card } from "../../../shared/kit";

interface Props {
  text: string | null;
}

export function TrendCard({ text }: Props) {
  if (!text) return null;
  return (
    <Card>
      <p className="text-ink-muted text-sm uppercase tracking-wide">
        Ein liebes Wort
      </p>
      <p className="text-[17px] text-ink mt-2">{text}</p>
    </Card>
  );
}
