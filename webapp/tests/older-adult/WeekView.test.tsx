import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WeekView from "../../src/modes/older-adult/WeekView";

const fakeHome = {
  greeting: "Guten Morgen",
  date: "2026-06-06",
  yesterday_walk: null,
  schematic_map: {
    home_lat: 52.52,
    home_lon: 13.4,
    places: [
      { place_id: "a", label: "bakery", centroid_lat: 52.521, centroid_lon: 13.401, visits: 5 },
      { place_id: "b", label: "park", centroid_lat: 52.519, centroid_lon: 13.399, visits: 3 },
    ],
    walk_polyline: [[52.52, 13.4]],
  },
  streak_days: 3,
  family_note: null,
  trend_card: null,
  week_distances: {
    headline: "Gehstrecke diese Woche stabil.",
    points: [
      { date: "2026-05-31", value: 1200 },
      { date: "2026-06-01", value: 1600 },
      { date: "2026-06-02", value: 1450 },
      { date: "2026-06-03", value: 1800 },
      { date: "2026-06-04", value: 1550 },
      { date: "2026-06-05", value: 1400 },
      { date: "2026-06-06", value: 1450 },
    ],
    baseline_mean: 1300,
  },
};

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WeekView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => fakeHome }),
  );
});

describe("Senior Week View", () => {
  it("shows the week distance card and the visited places with German labels", async () => {
    renderView();
    await waitFor(() =>
      expect(screen.getByText("Deine Woche")).toBeInTheDocument(),
    );
    // "Meine Woche" appears as both the section label and the bottom tab.
    expect(screen.getAllByText("Meine Woche").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Jeder Balken ist ein Tag/i),
    ).toBeInTheDocument();
    // Per-place frequency rows: German labels + warm frequency words (no cold "×" counts).
    expect(screen.getByText("Bäckerei")).toBeInTheDocument();
    expect(screen.getByText("Park")).toBeInTheDocument();
    expect(screen.getByText("fast immer")).toBeInTheDocument(); // most-visited spot
    expect(screen.getByText("oft")).toBeInTheDocument();
  });
});
