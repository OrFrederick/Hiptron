"""One-off: fetch real OSM foot routes for the demo personas and bake them to JSON.

The synthetic generator normally draws each outing as a smooth geometric arc, which
on a real OpenStreetMap basemap cuts straight across blocks and buildings. This
script pre-computes, per persona, the actual pedestrian street geometry the generator
samples instead:

  * `loop`  — a short block loop near home (home -> 4 corners -> home). The generator
              walks part of this to pad an outing's distance while staying close to
              home (so the activity radius stays small but the path length is large).
  * places  — for each named place, the foot route home -> destination. The route's
              far end is the snapped, on-street dwell location for that place's pin.

Run once (needs network); the result is committed as `routes.json` so `generate()`
stays fully offline and deterministic. Re-run only if a persona's home or places move.

    python -m hiptron.synthetic.bake_routes
"""

from __future__ import annotations

import json
import math
import time
import urllib.request
from pathlib import Path

from hiptron.synthetic.scenarios import DEFAULT_PLACES, SCENARIOS

OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/"
OUT = Path(__file__).with_name("routes.json")

METERS_PER_DEG_LAT = 111_320.0

# Block-loop corners: ~170 m from home on the diagonals, so OSRM stitches a tidy
# neighbourhood loop that stays well inside the 400 m activity-radius test bound.
LOOP_RADIUS_M = 170.0
LOOP_BEARINGS_DEG = (45.0, 135.0, 225.0, 315.0)


def _offset(lat: float, lon: float, north_m: float, east_m: float) -> tuple[float, float]:
    dlat = north_m / METERS_PER_DEG_LAT
    dlon = east_m / (METERS_PER_DEG_LAT * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def _osrm(coords: list[tuple[float, float]]) -> list[list[float]]:
    """coords are (lat, lon); return the route geometry as [[lat, lon], ...]."""
    path = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM}{path}?overview=full&geometries=geojson&continue_straight=false"
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.loads(resp.read())
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(f"OSRM failed: {data.get('code')} for {path}")
    geom = data["routes"][0]["geometry"]["coordinates"]
    return [[lat, lon] for lon, lat in geom]


def bake() -> dict:
    out: dict = {}
    for name, scn in SCENARIOS.items():
        home = (scn.home_lat, scn.home_lon)
        places = scn.places if scn.places is not None else DEFAULT_PLACES

        corners = [
            _offset(
                *home,
                LOOP_RADIUS_M * math.cos(math.radians(b)),
                LOOP_RADIUS_M * math.sin(math.radians(b)),
            )
            for b in LOOP_BEARINGS_DEG
        ]
        loop = _osrm([home, *corners, home])
        time.sleep(1.0)

        place_routes: dict[str, list[list[float]]] = {}
        # Dedupe by label so we issue one request per distinct place across personas.
        for p in places:
            if p.label in place_routes:
                continue
            dest = _offset(*home, p.lat_offset_m, p.lon_offset_m)
            place_routes[p.label] = _osrm([home, dest])
            time.sleep(1.0)

        out[scn.user_id] = {
            "home": [home[0], home[1]],
            "loop": loop,
            "places": place_routes,
        }
        print(f"[bake] {name}: loop={len(loop)} pts, places={list(place_routes)}")
    return out


def main() -> None:
    data = bake()
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"[bake] wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
