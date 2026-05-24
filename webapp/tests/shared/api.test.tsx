import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOlderAdultHome } from "../../src/shared/api";

const sample = {
  greeting: "Good morning",
  date: "2026-05-24",
  yesterday_walk: null,
  schematic_map: null,
  streak_days: 0,
  family_note: null,
  trend_card: null,
};

describe("useOlderAdultHome", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => sample }),
    );
  });

  it("fetches from /api/older-adult/home", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useOlderAdultHome("helga"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.greeting).toBe("Good morning");
    expect(fetch).toHaveBeenCalledWith(
      "/api/older-adult/home?user_id=helga",
      expect.any(Object),
    );
  });
});
