import { Link } from "react-router-dom";

import { Card } from "../../../shared/Card";

interface Props {
  status: "green" | "amber";
  summary: string;
  lastUpdate: string;
}

export function StatusCard({ status, summary, lastUpdate }: Props) {
  const dotColor = status === "green" ? "bg-moss-600" : "bg-amber-500";
  return (
    <Link to="/relative/insights" aria-label="Open insights detail">
      <Card>
        <div className="flex items-center gap-3">
          <span
            className={`w-4 h-4 rounded-full ${dotColor}`}
            aria-label={`status ${status}`}
          />
          <div className="flex-1">
            <p className="text-lg font-medium">{summary}</p>
            <p className="text-warm-800/60 text-sm">
              Updated {new Date(lastUpdate).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-warm-200 px-4 py-2 text-warm-800"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            ♥ Send
          </button>
        </div>
      </Card>
    </Link>
  );
}
