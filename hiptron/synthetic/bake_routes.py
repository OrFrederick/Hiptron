"""One-off: fetch real OSM foot routes for the demo personas and bake them to JSON.

The synthetic generator normally draws each outing as a smooth geometric arc, which
on a real OpenStreetMap basemap cuts straight across blocks and buildings. This
script pre-computes, per persona, the actual pedestrian street geometry the generator
samples instead:

  * `loop`  — a short block loop near home (home -> 4 corners -> home). The generator
              walks part of this to pad an outing's distance while staying close to
              home (so the activity radius stays small but the path length is large).
  * places  — for each named place, TWO real foot routes forming a circuit:
                `out`  home -> destination, and
                `back` destination -> home routed through a waypoint offset ~110 m
                       perpendicular to the home->dest line, so OSRM returns home
                       along a *parallel street* instead of retracing `out`.
              The walk renders as a genuine loop, not a doubled there-and-back line.
              Both legs share the snapped destination as the dwell pin.

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

# Perpendicular detour for the return leg: the dest->home route is pulled ~110 m to
# the side of the outbound line so OSRM snaps it onto a parallel street, turning the
# outing into a real loop. Kept small so the loop's farthest point stays well under
# the 400 m activity-radius bound (max ≈ hypot(dest_dist/2, BACK_OFFSET_M)).
BACK_OFFSET_M = 110.0


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

        place_routes: dict[str, dict[str, list[list[float]]]] = {}
        # Dedupe by label so we issue one request per distinct place across personas.
        for p in places:
            if p.label in place_routes:
                continue
            north, east = p.lat_offset_m, p.lon_offset_m
            dest = _offset(*home, north, east)
            out_leg = _osrm([home, dest])
            time.sleep(1.0)

            # Return leg via a point ~BACK_OFFSET_M to the left of the midpoint,
            # perpendicular to the home->dest direction, so OSRM finds a parallel
            # street home and the round trip reads as a loop. Unit perpendicular to
            # (east, north) is (-north, east)/|..|.
            dist_m = math.hypot(north, east) or 1.0
            perp_n, perp_e = east / dist_m, -north / dist_m
            via = _offset(
                *home,
                north / 2.0 + BACK_OFFSET_M * perp_n,
                east / 2.0 + BACK_OFFSET_M * perp_e,
            )
            back_leg = _osrm([dest, via, home])
            time.sleep(1.0)

            place_routes[p.label] = {"out": out_leg, "back": back_leg}

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
