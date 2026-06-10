import { useState } from "react";

import { Card } from "../../shared/kit";
import { LeafletMap } from "../../shared/LeafletMap";
import { MapModal } from "../../shared/MapModal";
import type {
  Place,
  SchematicMap as SchematicMapType,
} from "../../shared/types";

interface Props {
  map: SchematicMapType;
  onClick?: () => void;
}

// Kept for the projection unit test (tests/schematicMap.test.ts) and any
// future schematic fallback; the live map now renders via LeafletMap.
export const VIEW_SIZE = 320;
export const PADDING = 32;

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
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card ariaLabel="Wochenkarte" style={{ padding: 12 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#525C6B",
            margin: "2px 4px 10px",
          }}
        >
          Deine Karte
        </p>
        {/* Map area — tapping opens the full-screen overlay */}
        <div
          role="button"
          aria-label="Karte vergrößern"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
          style={{ cursor: "pointer", borderRadius: 16, overflow: "hidden" }}
        >
          <LeafletMap map={map} height={220} />
        </div>
        {/* Navigation row — tapping goes to the week view */}
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 6px 2px", cursor: onClick ? "pointer" : "default", minHeight: 44 }}
        >
          <span style={{ fontSize: 15, color: "#525C6B" }}>Deine Woche ansehen</span>
          <span style={{ fontSize: 15, color: "#525C6B" }}>›</span>
        </div>
      </Card>

      {modalOpen && (
        <MapModal
          map={map}
          title="Deine Karte"
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
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
