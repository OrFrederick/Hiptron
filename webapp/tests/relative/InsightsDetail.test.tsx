import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InsightsDetail from "../../src/modes/relative/InsightsDetail";

const fake = {
  user_id: "helga",
  blocks: [
    {
      feature: "total_distance_m",
      question: "Wie weit geht Helga?",
      verdict: "Gehstrecke ist stabil.",
      chart_kind: "bar",
      series: [
        { date: "2026-05-18", value: 1100, baseline: 1150 },
        { date: "2026-05-19", value: 1180, baseline: 1150 },
      ],
      hidden: false,
    },
    {
      feature: "activity_radius_m",
      question: "Hält die Tagesroutine an?",
      verdict: "Routine stabil.",
      chart_kind: "line",
      series: [{ date: "2026-05-18", value: 0.9, baseline: 0.92 }],
      hidden: false,
    },
    {
      feature: "n_outings",
      question: "Wie viele Ausgänge pro Tag?",
      verdict: "Anzahl der Ausgänge stabil.",
      chart_kind: "bar",
      series: [],
      hidden: true,
    },
    {
      feature: "place_count",
      question: "Wo war sie unterwegs?",
      verdict: "Bäckerei und Park an den meisten Tagen.",
      chart_kind: "places",
      series: [
        { label: "bakery", count: 5 },
        { label: "park", count: 3 },
      ],
      hidden: false,
    },
    {
      feature: null,
      question: "Gab es Veränderungen?",
      verdict: "Keine auffälligen Veränderungen.",
      chart_kind: "list",
      series: [],
      hidden: false,
    },
  ],
};

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InsightsDetail />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => fake }),
  );
});

describe("Insights Detail", () => {
  it("renders question + verdict per visible block, hides hidden blocks", async () => {
    renderView();
    // DistanceBlock renders the question from the mock block (feature: "total_distance_m")
    await waitFor(() =>
      expect(screen.getByText(/Wie weit geht Helga/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Gehstrecke ist stabil/i)).toBeInTheDocument();
    // n_outings block is hidden — its question should not appear
    expect(
      screen.queryByText(/Wie viele Ausgänge/i),
    ).not.toBeInTheDocument();
    // ChangepointsBlock (chart_kind: "list") renders its verdict
    expect(screen.getByText(/Keine auffälligen Veränderungen/i)).toBeInTheDocument();
  });
});
