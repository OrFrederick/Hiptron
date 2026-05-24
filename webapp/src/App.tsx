import { Link, Navigate, Route, Routes } from "react-router-dom";

import OlderAdultHome from "./modes/older-adult/Home";
import OlderAdultWeekView from "./modes/older-adult/WeekView";
import RelativeHome from "./modes/relative/Home";
import InsightsDetail from "./modes/relative/InsightsDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ModeChooser />} />
      <Route path="/older-adult" element={<OlderAdultHome />} />
      <Route path="/older-adult/week" element={<OlderAdultWeekView />} />
      <Route path="/relative" element={<RelativeHome />} />
      <Route path="/relative/insights" element={<InsightsDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ModeChooser() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Hiptron</h1>
      <p className="text-warm-800/80">Choose a mode (prototype):</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          className="rounded-2xl bg-moss-600 text-white px-6 py-4 text-center text-lg"
          to="/older-adult"
        >
          Older-Adult mode
        </Link>
        <Link
          className="rounded-2xl border-2 border-moss-600 text-moss-600 px-6 py-4 text-center text-lg"
          to="/relative"
        >
          Relative mode
        </Link>
      </div>
    </main>
  );
}
