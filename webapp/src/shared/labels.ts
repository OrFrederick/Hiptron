// Canonical place metadata, shared by every place-rendering surface (map pins,
// week view, insights, walk cards). Keys are the synthetic generator's place
// labels; each persona owns a distinct subset (see hiptron/synthetic/scenarios.py).
export const PLACE_LABEL_DE: Record<string, string> = {
  // helga (reference)
  bakery: "Bäckerei",
  park: "Park",
  doctor: "Arzt",
  friend: "Freundin",
  shop: "Laden",
  // ingrid
  cafe: "Café",
  library: "Bücherei",
  optician: "Optiker",
  neighbor: "Nachbarin",
  market: "Markt",
  // margarete
  konditorei: "Konditorei",
  biergarten: "Biergarten",
  clinic: "Praxis",
  daughter: "Tochter",
  grocer: "Lebensmittel",
  // otto
  bistro: "Bistro",
  kiosk: "Kiosk",
  hardware: "Baumarkt",
  sister: "Schwester",
  pharmacy: "Apotheke",
};

export const PLACE_COLOR: Record<string, string> = {
  bakery: "#F2B705",
  park: "#34A853",
  doctor: "#1F5FE0",
  friend: "#8B5CF6",
  shop: "#0EA5A0",
  cafe: "#B45309",
  library: "#6366F1",
  optician: "#0891B2",
  neighbor: "#DB2777",
  market: "#16A34A",
  konditorei: "#D97706",
  biergarten: "#65A30D",
  clinic: "#2563EB",
  daughter: "#E11D48",
  grocer: "#059669",
  bistro: "#C2410C",
  kiosk: "#7C3AED",
  hardware: "#475569",
  sister: "#BE185D",
  pharmacy: "#0D9488",
};

export function placeLabel(s: string): string {
  if (PLACE_LABEL_DE[s]) return PLACE_LABEL_DE[s];
  if (s.startsWith("place_")) return "Ort";
  return s;
}

export function placeColor(s: string): string {
  return PLACE_COLOR[s] ?? "#1F5FE0";
}

export function kmLabel(distance_m: number): { value: string; unit: string } {
  if (distance_m < 1000) {
    return { value: String(Math.round(distance_m)), unit: "m" };
  }
  const km = Math.round(distance_m / 100) / 10;
  return { value: km.toFixed(1).replace(".", ","), unit: "km" };
}

export function durationMin(startTs: string, endTs: string): number {
  const ms = new Date(endTs).getTime() - new Date(startTs).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function relativeTimeDe(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}
