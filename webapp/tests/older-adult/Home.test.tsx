import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "../../src/modes/older-adult/Home";

const fakeHome = {
  greeting: "Good morning",
  date: "2026-05-24",
  yesterday_walk: {
    walk_id: "w1",
    start_ts: "2026-05-23T09:00:00",
    end_ts: "2026-05-23T09:45:00",
    distance_m: 1450.0,
    place_labels: ["bakery", "park"],
  },
  schematic_map: {
    home_lat: 52.52, home_lon: 13.40, places: [], walk_polyline: [[52.52, 13.40]],
  },
  streak_days: 5,
  family_note: "Anna sent a heart for your walk yesterday",
  trend_card: null,
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Home />
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

describe("Older-Adult Home", () => {
  it("shows greeting, distance, streak, family note", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/Good morning/i)).toBeInTheDocument());
    expect(screen.getByText(/1\.45 km/)).toBeInTheDocument();
    expect(screen.getByText(/5 days in a row/i)).toBeInTheDocument();
    expect(screen.getByText(/Anna sent a heart/i)).toBeInTheDocument();
  });
});
