import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InsightsDetail from "../../src/modes/relative/InsightsDetail";

const fake = {
  user_id: "helga",
  blocks: [
    {
      question: "How far is Helga going?",
      verdict: "Distance is steady.",
      chart_kind: "bar",
      series: [
        { date: "2026-05-18", value: 1100, baseline: 1150 },
        { date: "2026-05-19", value: 1180, baseline: 1150 },
      ],
      hidden: false,
    },
    {
      question: "Is the daily routine holding?",
      verdict: "Routine holding.",
      chart_kind: "line",
      series: [{ date: "2026-05-18", value: 0.9, baseline: 0.92 }],
      hidden: false,
    },
    {
      question: "Are walks getting harder?",
      verdict: "Fatigue signal stable.",
      chart_kind: "line",
      series: [],
      hidden: true,
    },
    {
      question: "Where has she been?",
      verdict: "Bakery and park most days.",
      chart_kind: "places",
      series: [
        { label: "bakery", count: 5 },
        { label: "park", count: 3 },
      ],
      hidden: false,
    },
    {
      question: "Any change-points lately?",
      verdict: "Nothing has changed enough to mention.",
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
    await waitFor(() =>
      expect(screen.getByText(/How far is Helga going/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Distance is steady/)).toBeInTheDocument();
    expect(screen.queryByText(/Are walks getting harder/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing has changed enough/i)).toBeInTheDocument();
  });
});
