import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RelativeHome from "../../src/modes/relative/Home";

const fakeHome = {
  status: "green",
  last_update: "2026-05-24T08:00:00",
  summary: "Routine wirkt unauffällig.",
  weekly_trend: {
    headline: "Gehstrecke diese Woche stabil.",
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
    // StatusCard renders summary directly from API
    await waitFor(() =>
      expect(screen.getByText(/Routine wirkt unauffällig/i)).toBeInTheDocument(),
    );
    // WeeklyTrendCard renders headline directly from API
    expect(screen.getByText(/Gehstrecke diese Woche stabil/i)).toBeInTheDocument();
    // WorthNoticingCard should not render when worth_noticing is null
    // "7 Tage stummschalten" is a button unique to WorthNoticingCard
    expect(screen.queryByText(/7 Tage stummschalten/i)).not.toBeInTheDocument();
    // FooterPrivacyCard German text
    expect(screen.getByText(/Helga bestimmt/i)).toBeInTheDocument();
  });
});
