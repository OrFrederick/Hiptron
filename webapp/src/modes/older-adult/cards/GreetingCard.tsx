import { Card } from "../../../shared/Card";

interface Props {
  greeting: string;
  name: string;
  date: string;
}

export function GreetingCard({ greeting, name, date }: Props) {
  const formattedDate = new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <Card className="text-center">
      <h1 className="text-2xl font-semibold">
        {greeting}, {name}
      </h1>
      <p className="text-warm-800/70 mt-1">{formattedDate}</p>
    </Card>
  );
}
