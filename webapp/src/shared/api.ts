import { useQuery } from "@tanstack/react-query";

import type { InsightsDetail, OlderAdultHome, PatternsScreen, RelativeHome } from "./types";

const DEFAULT_USER = "helga";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useOlderAdultHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["older-adult-home", userId],
    queryFn: () =>
      fetchJson<OlderAdultHome>(`/api/older-adult/home?user_id=${userId}`),
  });
}

export function useRelativeHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-home", userId],
    queryFn: () =>
      fetchJson<RelativeHome>(`/api/relative/home?user_id=${userId}`),
  });
}

export function useRelativeInsights(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-insights", userId],
    queryFn: () =>
      fetchJson<InsightsDetail>(`/api/relative/insights?user_id=${userId}`),
  });
}

export function useRelativePatterns(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-patterns", userId],
    queryFn: () =>
      fetchJson<PatternsScreen>(`/api/relative/patterns?user_id=${userId}`),
  });
}
