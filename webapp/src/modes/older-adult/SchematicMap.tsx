import { useMemo } from "react";

import { Card } from "../../shared/Card";
import type {
  Place,
  SchematicMap as SchematicMapType,
} from "../../shared/types";

interface Props {
  map: SchematicMapType;
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
  bakery: "#D89B4A",
  park: "#7BA688",
  doctor: "#C66B5C",
  friend: "#B98AC9",
  shop: "#E0B870",
};

function labelDe(s: string): string {
  if (LABEL_DE[s]) return LABEL_DE[s];
  if (s.startsWith("place_")) return "Ort";
  return s;
}

function dedupePlaces(places: Place[]): Place[] {
  const groups = new Map<string, Place[]>();
  for (const p of places) {
    const arr = groups.get(p.label) ?? [];
    arr.push(p);
    groups.set(p.label, arr);
  }
  const merged: Place[] = [];
  for (const [, arr] of groups) {
    const first = arr[0];
    if (!first) continue;
    const lat = arr.reduce((s, p) => s + p.centroid_lat, 0) / arr.length;
    const lon = arr.reduce((s, p) => s + p.centroid_lon, 0) / arr.length;
    merged.push({
      place_id: first.place_id,
      label: first.label,
      centroid_lat: lat,
      centroid_lon: lon,
    });
  }
  return merged;
}

export function SchematicMap({ map }: Props) {
  const { homePx, places, polyline } = useMemo(() => projectPoints(map), [map]);

  return (
    <Card ariaLabel="Schematische Wochenkarte">
      <p className="text-warm-800/70 text-sm uppercase tracking-wide mb-2">
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
              stroke="#E8DFD2"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          fill="#FBF7F2"
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
          stroke="#4F7E5E"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {places.map(({ place, x, y }, i) => {
          const color = LABEL_COLOR[place.label] ?? "#D89B4A";
          const offsetY = i % 2 === 0 ? -14 : 22;
          return (
            <g key={place.place_id}>
              <circle
                cx={x}
                cy={y}
                r="9"
                fill={color}
                stroke="#FBF7F2"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + offsetY}
                textAnchor="middle"
                fontSize="12"
                fontWeight="500"
                fill="#3D2F22"
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
            fill="#3D6E4E"
            stroke="#FBF7F2"
            strokeWidth="3"
          />
          <text
            x={homePx[0]}
            y={homePx[1] + 26}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#3D2F22"
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
  const lo = PADDING;
  const hi = VIEW_SIZE - PADDING;
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
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
