// webapp/src/shared/embed.ts
// Pitch-embed mode: hides the persona switcher (not part of the real app).
// Driven purely by the current URL (?embed=1). In-app navigation carries the
// flag along via useEmbedSuffix(), so it survives tab/back navigation without
// leaking into normal browsing the way a sticky session flag would.
import { useSearchParams } from "react-router-dom";

export function useEmbed(): boolean {
  const [params] = useSearchParams();
  const v = params.get("embed");
  return v != null && v !== "0" && v !== "false";
}

// Query-string fragment to append to internal ?u=… links so embed mode persists
// across navigation. Empty when not embedded.
export function useEmbedSuffix(): string {
  return useEmbed() ? "&embed=1" : "";
}
