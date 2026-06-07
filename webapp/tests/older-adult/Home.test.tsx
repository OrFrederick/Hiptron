import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "../../src/modes/older-adult/Home";

const fakeHome = {
  greeting: "Guten Morgen",
  date: "2026-05-24",
  yesterday_walk: {
    walk_id: "w1",
    start_ts: "2026-05-23T09:00:00",
    end_ts: "2026-05-23T09:45:00",
    distance_m: 1450.0,
    place_labels: ["bakery", "park"],
  },
  schematic_map: {
    home_lat: 52.52,
    home_lon: 13.4,
    places: [],
    walk_polyline: [[52.52, 13.4]],
  },
  streak_days: 5,
  family_note: "Anna hat ein Herz für deinen gestrigen Spaziergang gesendet",
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
    await waitFor(() =>
      expect(screen.getByText(/Guten Morgen/i)).toBeInTheDocument(),
    );
    // Checklist row formats yesterday distance (German decimal comma)
    expect(screen.getByText(/1,5 km gestern/i)).toBeInTheDocument();
    // Streak checklist row "N Tage in Folge draußen"
    expect(screen.getByText(/5 Tage in Folge/i)).toBeInTheDocument();
    expect(screen.getByText(/Anna hat ein Herz/i)).toBeInTheDocument();
  });
});
