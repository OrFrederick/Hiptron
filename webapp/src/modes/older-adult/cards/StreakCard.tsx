import { Card } from "../../../shared/Card";

interface Props { days: number; }

export function StreakCard({ days }: Props) {
  if (days <= 0) return null;
  return (
    <Card className="bg-moss-400/20 border-moss-400">
      <p className="text-lg">⭐ {days} days in a row outside.</p>
    </Card>
  );
}
