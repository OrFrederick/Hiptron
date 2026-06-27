import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Place, SchematicMap } from "./types";
import { placeColor, placeLabel } from "./labels";

// Clustering splits one real spot (e.g. the bakery) into several low-visit
// clusters with the same label. On a real map that reads as "3× Bäckerei",
// which looks broken — collapse to one pin per label at its busiest centroid.
function mergeByLabel(places: Place[]): Place[] {
  const best = new Map<string, Place>();
  for (const p of places) {
    const cur = best.get(p.label);
    if (!cur || (p.visits ?? 0) > (cur.visits ?? 0)) best.set(p.label, p);
  }
  return [...best.values()];
}

function placeIcon(label: string, flip = false): L.DivIcon {
  const color = placeColor(label);
  const text = placeLabel(label);
  const html = flip
    ? `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
      <span style="margin-bottom:3px;font:600 12.5px/1 -apple-system,system-ui,sans-serif;color:#1A2230;white-space:nowrap;text-shadow:0 1px 2px #fff,0 0 3px #fff,0 0 3px #fff">${text}</span>
      <span style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(16,32,60,.35)"></span>
    </div>`
    : `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
      <span style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(16,32,60,.35)"></span>
      <span style="margin-top:3px;font:600 12.5px/1 -apple-system,system-ui,sans-serif;color:#1A2230;white-space:nowrap;text-shadow:0 1px 2px #fff,0 0 3px #fff,0 0 3px #fff">${text}</span>
    </div>`;
  return L.divIcon({
    className: "hip-pin",
    html,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function homeIcon(): L.DivIcon {
  return L.divIcon({
    className: "hip-pin",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
      <span style="width:20px;height:20px;border-radius:50%;background:#0E2A47;border:3px solid #fff;box-shadow:0 1px 5px rgba(16,32,60,.4)"></span>
      <span style="margin-top:3px;font:700 11.5px/1 -apple-system,system-ui,sans-serif;color:#1A2230;white-space:nowrap;text-shadow:0 1px 2px #fff,0 0 3px #fff,0 0 3px #fff">Zuhause</span>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function lastSeenIcon(initial: string): L.DivIcon {
  return L.divIcon({
    className: "hip-pin",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
      <span style="background:#0E2A47;border-radius:50%;padding:3px;box-shadow:0 2px 8px rgba(16,32,60,.45)">
        <span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#163B66;color:#fff;font:600 14px/1 -apple-system,system-ui,sans-serif">${initial.slice(0, 1)}</span>
      </span>
      <span style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #0E2A47;margin-top:-1px"></span>
    </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
}

interface Props {
  map: SchematicMap;
  height?: number | string;
  interactive?: boolean;
  // Show a "last seen" avatar marker at the end of the route (relative view).
  lastSeenInitial?: string;
}

// Real OpenStreetMap tile map: home + deduped place pins + the actual GPS route.
// Replaces the schematic SVG grid — actual streets, so it reads as a real map.
export function LeafletMap({ map, height = 210, interactive = false, lastSeenInitial }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;

    let m: L.Map | null = null;
    try {
      m = L.map(el, {
        // Fractional zoom so fitBounds can spread tightly clustered pins
        // instead of snapping a whole level out (labels collide at z15).
        zoomSnap: 0.25,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      // CARTO Positron (no labels) — a clean, muted, Apple-card-style basemap.
      // Our own pins carry the labels, so the tiles stay calm and uncluttered.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: "© OpenStreetMap, © CARTO",
        },
      ).addTo(m);
      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(m);

      const places = mergeByLabel(map.places ?? []);
      const isLatLng = (p: unknown): p is [number, number] =>
        Array.isArray(p) && p.length === 2;
      // Prefer the multi-walk layer (a week of loops); fall back to the single line.
      const rawLines =
        map.walk_polylines && map.walk_polylines.length > 0
          ? map.walk_polylines
          : [map.walk_polyline ?? []];
      const lines = rawLines
        .map((ln) => (ln ?? []).filter(isLatLng))
        .filter((ln) => ln.length > 1);
      const newest = lines[0] ?? [];

      // Draw oldest first so the newest walk sits bold on top; earlier walks are
      // faint trails, so a week of routine reads without burying the latest one.
      for (let i = lines.length - 1; i >= 0; i--) {
        const isNewest = i === 0;
        L.polyline(lines[i]!, {
          color: "#1F5FE0",
          weight: isNewest ? 5 : 3,
          opacity: isNewest ? 1 : 0.32,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(m);
      }

      // Sort by latitude so neighbouring pins get alternating label sides.
      const sortedPlaces = [...places].sort((a, b) => b.centroid_lat - a.centroid_lat);
      sortedPlaces.forEach((p, i) => {
        L.marker([p.centroid_lat, p.centroid_lon], {
          icon: placeIcon(p.label, i % 2 === 1),
          interactive: false,
          keyboard: false,
        }).addTo(m!);
      });

      L.marker([map.home_lat, map.home_lon], {
        icon: homeIcon(),
        interactive: false,
        keyboard: false,
      }).addTo(m);

      const lastPt = newest[newest.length - 1];
      if (lastSeenInitial && lastPt) {
        L.marker(lastPt, {
          icon: lastSeenIcon(lastSeenInitial),
          interactive: false,
          keyboard: false,
        }).addTo(m);
      }

      const pts: [number, number][] = [
        [map.home_lat, map.home_lon],
        ...places.map((p): [number, number] => [p.centroid_lat, p.centroid_lon]),
        ...lines.flat(),
      ];
      const bounds = L.latLngBounds(pts);
      if (bounds.isValid()) {
        m.fitBounds(bounds, { padding: [26, 26], maxZoom: 16 });
      } else {
        m.setView([map.home_lat, map.home_lon], 15);
      }
      mapRef.current = m;
      // Card layout settles after mount; recompute tile size so no grey gaps.
      setTimeout(() => {
        try {
          mapRef.current?.invalidateSize();
        } catch {
          /* container gone */
        }
      }, 60);
    } catch {
      // jsdom / no-layout environments can't host a live Leaflet map — the
      // container div still renders; skip the map quietly.
      try {
        m?.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
      return;
    }

    const created = m;
    return () => {
      try {
        created.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
    };
  }, [map, interactive, lastSeenInitial]);

  return (
    <div
      ref={elRef}
      role="img"
      aria-label="Karte mit Zuhause, Orten und der letzten Route"
      style={{
        height,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        // Confine Leaflet's internal stacking so its panes never sit above the bottom tab bar.
        position: "relative",
        zIndex: 0,
        isolation: "isolate",
        background: "#E8EEF4",
      }}
    />
  );
}
