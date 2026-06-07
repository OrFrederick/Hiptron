import { useMemo } from "react";

import { Card } from "../../shared/kit";
import type {
  Place,
  SchematicMap as SchematicMapType,
} from "../../shared/types";

interface Props {
  map: SchematicMapType;
  onClick?: () => void;
}

export const VIEW_SIZE = 320;
export const PADDING = 32;

const LABEL_DE: Record<string, string> = {
  bakery: "Bäckerei",
  park: "Park",
  doctor: "Arzt",
  friend: "Freundin",
  shop: "Laden",
};

const LABEL_COLOR: Record<string, string> = {
  bakery: "#F2B705",
  park: "#34A853",
  doctor: "#1F5FE0",
  friend: "#8B5CF6",
  shop: "#0EA5A0",
};

function labelDe(s: string): string {
  if (LABEL_DE[s]) return LABEL_DE[s];
  if (s.startsWith("place_")) return "Ort";
  return s;
}

const MERGE_M = 40;

function approxMeters(a: Place, b: Place): number {
  const mPerDegLat = 111_320;
  const dLat = (a.centroid_lat - b.centroid_lat) * mPerDegLat;
  const dLon =
    (a.centroid_lon - b.centroid_lon) *
    mPerDegLat *
    Math.cos((a.centroid_lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

// Merge only places that sit on the same spot; keep genuinely distinct clusters
// as separate dots at their true centroids (never average distinct locations).
function dedupePlaces(places: Place[]): Place[] {
  const kept: Place[] = [];
  for (const p of places) {
    if (!kept.some((k) => approxMeters(k, p) < MERGE_M)) kept.push(p);
  }
  return kept;
}

export function SchematicMap({ map, onClick }: Props) {
  const { homePx, places, polyline } = useMemo(() => projectPoints(map), [map]);

  return (
    <Card ariaLabel="Schematische Wochenkarte" onClick={onClick}>
      <p className="text-ink-muted text-sm uppercase tracking-wide mb-2">
        Deine Karte
      </p>
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full h-auto"
        role="img"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#E1E7F0"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          fill="#EEF2F8"
          rx="16"
        />
        <rect
          x={PADDING / 2}
          y={PADDING / 2}
          width={VIEW_SIZE - PADDING}
          height={VIEW_SIZE - PADDING}
          fill="url(#grid)"
          rx="12"
        />
        <polyline
          aria-label="Spazierweg"
          points={polyline.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#1F5FE0"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {places.map(({ place, x, y }, i) => {
          const color = LABEL_COLOR[place.label] ?? "#1F5FE0";
          const offsetY = i % 2 === 0 ? -14 : 22;
          return (
            <g key={place.place_id}>
              <circle
                cx={x}
                cy={y}
                r="9"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + offsetY}
                textAnchor="middle"
                fontSize="12"
                fontWeight="500"
                fill="#1A2230"
              >
                {labelDe(place.label)}
              </text>
            </g>
          );
        })}
        <g>
          <circle
            aria-label="Zuhause"
            cx={homePx[0]}
            cy={homePx[1]}
            r="11"
            fill="#0E2A47"
            stroke="#fff"
            strokeWidth="3"
          />
          <text
            x={homePx[0]}
            y={homePx[1] + 26}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#1A2230"
          >
            Zuhause
          </text>
        </g>
      </svg>
    </Card>
  );
}

export function projectPoints(map: SchematicMapType) {
  const places = dedupePlaces(map.places);
  const all: [number, number][] = [
    [map.home_lat, map.home_lon],
    ...places.map((p): [number, number] => [p.centroid_lat, p.centroid_lon]),
    ...map.walk_polyline,
  ];
  const lats = all.map(([la]) => la);
  const lons = all.map(([, lo]) => lo);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const dLat = Math.max(1e-6, maxLat - minLat);
  const dLon = Math.max(1e-6, maxLon - minLon);
  const inner = VIEW_SIZE - PADDING * 2;
  const clampLo = PADDING;
  const clampHi = VIEW_SIZE - PADDING;
  const clamp = (n: number) => Math.min(clampHi, Math.max(clampLo, n));
  const project = (lat: number, lon: number): [number, number] => {
    const x = PADDING + ((lon - minLon) / dLon) * inner;
    const y = VIEW_SIZE - PADDING - ((lat - minLat) / dLat) * inner;
    return [clamp(x), clamp(y)];
  };
  return {
    homePx: project(map.home_lat, map.home_lon),
    places: places.map((place: Place) => {
      const [x, y] = project(place.centroid_lat, place.centroid_lon);
      return { place, x, y };
    }),
    polyline: map.walk_polyline.map(([la, lo]) => project(la, lo)),
  };
}

export default SchematicMap;
