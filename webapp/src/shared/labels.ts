const PLACE_LABEL_DE: Record<string, string> = {
  bakery: "Bäckerei",
  park: "Park",
  doctor: "Arzt",
  friend: "Freundin",
  shop: "Laden",
};

export function placeLabel(s: string): string {
  if (PLACE_LABEL_DE[s]) return PLACE_LABEL_DE[s];
  if (s.startsWith("place_")) return "Ort";
  return s;
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
