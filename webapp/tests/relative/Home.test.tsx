import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RelativeHome from "../../src/modes/relative/Home";

const fakeHome = {
  status: "green",
  last_update: "2026-05-24T08:00:00",
  summary: "Routine looks normal.",
  weekly_trend: {
    headline: "Walking distance steady this week.",
    points: [
      { date: "2026-05-18", value: 1200 },
      { date: "2026-05-19", value: 1100 },
    ],
    baseline_mean: 1150,
  },
  worth_noticing: null,
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RelativeHome />
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

describe("Relative Home", () => {
  it("shows status dot, trend headline, no worth-noticing card, privacy footer", async () => {
    renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Routine looks normal/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/steady this week/i)).toBeInTheDocument();
    expect(screen.queryByText(/worth noticing/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Helga controls/i)).toBeInTheDocument();
  });
});
