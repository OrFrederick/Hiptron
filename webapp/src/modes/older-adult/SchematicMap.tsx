import { useMemo } from "react";

import { Card } from "../../shared/Card";
import type {
  Place,
  SchematicMap as SchematicMapType,
} from "../../shared/types";

interface Props {
  map: SchematicMapType;
}

const VIEW_SIZE = 300;
const PADDING = 24;

export function SchematicMap({ map }: Props) {
  const { homePx, places, polyline } = useMemo(() => projectPoints(map), [map]);

  return (
    <Card ariaLabel="Schematic map of your week">
      <p className="text-warm-800/70 text-sm uppercase tracking-wide mb-2">
        Your map
      </p>
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full h-auto"
        role="img"
      >
        <rect
          x="0"
          y="0"
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          fill="#FBF7F2"
          rx="16"
        />
        <polyline
          aria-label="walk path"
          points={polyline.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#7BA688"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {places.map(({ place, x, y }) => (
          <g key={place.place_id}>
            <circle cx={x} cy={y} r="8" fill="#D89B4A" />
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              className="text-xs"
              fill="#3D2F22"
            >
              {place.label}
            </text>
          </g>
        ))}
        <circle
          aria-label="home"
          cx={homePx[0]}
          cy={homePx[1]}
          r="10"
          fill="#4F7E5E"
          stroke="#FBF7F2"
          strokeWidth="3"
        />
      </svg>
    </Card>
  );
}

function projectPoints(map: SchematicMapType) {
  const all: [number, number][] = [
    [map.home_lat, map.home_lon],
    ...map.places.map((p): [number, number] => [
      p.centroid_lat,
      p.centroid_lon,
    ]),
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
  const project = (lat: number, lon: number): [number, number] => {
    const x = PADDING + ((lon - minLon) / dLon) * inner;
    const y = VIEW_SIZE - PADDING - ((lat - minLat) / dLat) * inner;
    return [x, y];
  };
  return {
    homePx: project(map.home_lat, map.home_lon),
    places: map.places.map((place: Place) => {
      const [x, y] = project(place.centroid_lat, place.centroid_lon);
      return { place, x, y };
    }),
    polyline: map.walk_polyline.map(([la, lo]) => project(la, lo)),
  };
}

export default SchematicMap;
