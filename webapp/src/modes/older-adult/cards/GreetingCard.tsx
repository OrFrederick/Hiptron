import { Card } from "../../../shared/Card";

interface Props { greeting: string; date: string; }

export function GreetingCard({ greeting, date }: Props) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
  return (
    <Card className="text-center">
      <h1 className="text-2xl font-semibold">{greeting}, Helga</h1>
      <p className="text-warm-800/70 mt-1">{formattedDate}</p>
    </Card>
  );
}
