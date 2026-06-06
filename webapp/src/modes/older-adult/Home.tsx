import { Link } from "react-router-dom";

import { useOlderAdultHome } from "../../shared/api";
import { PersonaSwitcher } from "../../shared/PersonaSwitcher";
import { usePersona } from "../../shared/persona";
import { GreetingCard } from "./cards/GreetingCard";
import { YesterdayWalkCard } from "./cards/YesterdayWalkCard";
import { StreakCard } from "./cards/StreakCard";
import { FamilyNoteCard } from "./cards/FamilyNoteCard";
import { TrendCard } from "./cards/TrendCard";
import { SchematicMap } from "./SchematicMap";

export default function OlderAdultHome() {
  const userId = usePersona();
  const { data, isLoading, isError } = useOlderAdultHome(userId);

  if (isLoading) return <FullScreenMessage text="Lade deinen Tag…" />;
  if (isError || !data)
    return <FullScreenMessage text="Etwas ist still geworden. Bitte später erneut versuchen." />;

  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <PersonaSwitcher />
      <GreetingCard greeting={data.greeting} date={data.date} />
      <YesterdayWalkCard walk={data.yesterday_walk} />
      {data.schematic_map && (
        <Link to={`/older-adult/week?u=${userId}`} aria-label="Wochenansicht öffnen">
          <SchematicMap map={data.schematic_map} />
        </Link>
      )}
      <StreakCard days={data.streak_days} />
      <FamilyNoteCard note={data.family_note} />
      <TrendCard text={data.trend_card} />
    </main>
  );
}

function FullScreenMessage({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-lg text-warm-800/80">
      {text}
    </main>
  );
}
