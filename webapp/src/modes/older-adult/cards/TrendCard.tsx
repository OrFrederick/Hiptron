import { Card } from "../../../shared/Card";

interface Props { text: string | null; }

export function TrendCard({ text }: Props) {
  if (!text) return null;
  return (
    <Card>
      <p className="text-warm-800/70 text-sm uppercase tracking-wide">A gentle note</p>
      <p className="text-lg mt-2">{text}</p>
    </Card>
  );
}
