import { useRelativeHome } from "../../shared/api";
import { FooterPrivacyCard } from "./cards/FooterPrivacyCard";
import { StatusCard } from "./cards/StatusCard";
import { WeeklyTrendCard } from "./cards/WeeklyTrendCard";
import { WorthNoticingCard } from "./cards/WorthNoticingCard";

export default function RelativeHome() {
  const { data, isLoading, isError } = useRelativeHome();
  if (isLoading) return <Loading />;
  if (isError || !data)
    return <Loading text="Couldn't load — try again later." />;
  return (
    <main className="min-h-screen bg-warm-50 py-6 px-4 max-w-md mx-auto flex flex-col gap-4">
      <StatusCard
        status={data.status}
        summary={data.summary}
        lastUpdate={data.last_update}
      />
      <WeeklyTrendCard trend={data.weekly_trend} />
      {data.worth_noticing && <WorthNoticingCard item={data.worth_noticing} />}
      <FooterPrivacyCard />
    </main>
  );
}

function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-lg text-warm-800/80">
      {text}
    </main>
  );
}
