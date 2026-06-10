import { useQuery } from "@tanstack/react-query";

import type { InsightsDetail, OlderAdultHome, PatternsScreen, RelativeHome } from "./types";

const DEFAULT_USER = "helga";

// Static builds (GitHub Pages) ship pre-baked JSON snapshots instead of a live
// backend: scripts/bake_static_api.py writes public/api/<endpoint>/<user>.json.
const STATIC_API = import.meta.env.VITE_STATIC_API === "1";

function apiUrl(endpoint: string, userId: string): string {
  return STATIC_API
    ? `${import.meta.env.BASE_URL}api/${endpoint}/${userId}.json`
    : `/api/${endpoint}?user_id=${userId}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useOlderAdultHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["older-adult-home", userId],
    queryFn: () =>
      fetchJson<OlderAdultHome>(apiUrl("older-adult/home", userId)),
  });
}

export function useRelativeHome(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-home", userId],
    queryFn: () =>
      fetchJson<RelativeHome>(apiUrl("relative/home", userId)),
  });
}

export function useRelativeInsights(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-insights", userId],
    queryFn: () =>
      fetchJson<InsightsDetail>(apiUrl("relative/insights", userId)),
  });
}

export function useRelativePatterns(userId: string = DEFAULT_USER) {
  return useQuery({
    queryKey: ["relative-patterns", userId],
    queryFn: () =>
      fetchJson<PatternsScreen>(apiUrl("relative/patterns", userId)),
  });
}
