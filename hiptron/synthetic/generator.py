import datetime as dt_mod
import json
import math
import random
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import duckdb

from hiptron.synthetic.scenarios import DEFAULT_PLACES, NamedPlace, Scenario

METERS_PER_DEG_LAT = 111_320.0

_ROUTES_PATH = Path(__file__).with_name("routes.json")


@lru_cache(maxsize=1)
def _routes() -> dict[str, Any]:
    """Baked real-street foot routes per demo persona (see bake_routes.py).

    Loaded once and cached. Missing file -> empty map, so the generator falls
    back to the geometric arc model for any user without baked routes (keeps the
    unit-test scenarios, which use throwaway user ids, on the old code path)."""
    try:
        return json.loads(_ROUTES_PATH.read_text())
    except FileNotFoundError:
        return {}


def _haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = math.radians(b[0] - a[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _resample(poly: list[list[float]], step_m: float, max_m: float) -> list[tuple[float, float]]:
    """Walk `poly` ([[lat,lon],...]) emitting points every ~step_m up to max_m of
    arc length. Linearly interpolates between vertices so spacing stays uniform
    regardless of the source vertex density."""
    pts: list[tuple[float, float]] = [(poly[0][0], poly[0][1])]
    if max_m <= 0 or len(poly) < 2:
        return pts
    target = step_m
    walked = 0.0
    for i in range(1, len(poly)):
        a = (poly[i - 1][0], poly[i - 1][1])
        b = (poly[i][0], poly[i][1])
        seg = _haversine_m(a, b)
        if seg <= 0:
            continue
        while walked + seg >= target and target <= max_m:
            f = (target - walked) / seg
            pts.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
            target += step_m
        walked += seg
        if walked >= max_m:
            break
    return pts

# Transit fixes are spaced wide enough (> the 10 m dwell threshold in the place
# clusterer) that the moving leg is never mistaken for a stop; the standing-still
# dwell at the destination carries the bulk of the GPS volume instead.
TRANSIT_STEP_M = 22.0
TRANSIT_STEP_S = 15
DWELL_SAMPLE_S = 10


def _m_to_deg_lat(m: float) -> float:
    return m / METERS_PER_DEG_LAT


def _m_to_deg_lon(m: float, at_lat: float) -> float:
    return m / (METERS_PER_DEG_LAT * math.cos(math.radians(at_lat)))


def generate(scenario: Scenario, con: duckdb.DuckDBPyConnection) -> None:
    """Write synthetic GPS fixes for `scenario` into the `gps_fixes` table."""
    rng = random.Random(scenario.seed)
    # Separate stream for all gait-related draws (pause placement/holds): keeps the
    # main draw sequence bit-identical to pre-gait code, so route/place/changepoint
    # timing of existing personas does not drift.
    gait_rng = random.Random(f"{scenario.seed}-gait")
    rows: list[tuple[str, datetime, float, float, float]] = []

    start = scenario.start().replace(hour=0, minute=0, second=0, microsecond=0)
    end = scenario.end()

    # Outings first: each returns the time window it occupies so the home idle
    # stream can avoid placing the user at home while they are actually out (which
    # would otherwise smear the walk polyline back to home every few minutes).
    outing_spans: list[tuple[datetime, datetime]] = []
    day = start.date()
    end_date = end.date()
    while day <= end_date:
        week_idx = (day - start.date()).days // 7
        decline_factor = _decline_factor(scenario, week_idx)
        places = _places_for_week(scenario, week_idx, rng)
        n_out = _outings_for_week(scenario, week_idx)
        picks: list[tuple[datetime, NamedPlace]] = []
        for _ in range(n_out):
            place = _pick_place(places, day, rng)
            if place is None:
                continue
            intended = datetime.combine(day, datetime.min.time()) + timedelta(
                hours=place.typical_hour, minutes=rng.randint(-30, 30)
            )
            picks.append((intended, place))
        # Serialise the day's outings so they never overlap in time: an overlap
        # would make the walk segmenter chain two trips into one giant walk.
        picks.sort(key=lambda p: p[0])
        next_free: datetime | None = None
        for intended, place in picks:
            start_dt = intended
            if next_free is not None and start_dt < next_free:
                start_dt = next_free
            end_dt = _emit_outing(
                rows, scenario, place, start_dt, decline_factor, rng, week_idx, gait_rng
            )
            outing_spans.append((start_dt, end_dt))
            next_free = end_dt + timedelta(minutes=15)
        day += timedelta(days=1)

    outing_spans.sort()
    span_idx = 0
    cur = start
    while cur < end:
        while span_idx < len(outing_spans) and outing_spans[span_idx][1] < cur:
            span_idx += 1
        out = (
            span_idx < len(outing_spans)
            and outing_spans[span_idx][0] <= cur <= outing_spans[span_idx][1]
        )
        if not out:
            rows.append(
                (
                    scenario.user_id,
                    cur,
                    scenario.home_lat + rng.gauss(0, 2e-6),
                    scenario.home_lon + rng.gauss(0, 2e-6),
                    6.0,
                )
            )
        cur += timedelta(minutes=5)

    con.executemany("INSERT OR REPLACE INTO gps_fixes VALUES (?, ?, ?, ?, ?)", rows)


def _decline_factor(scenario: Scenario, week_idx: int) -> float:
    if (
        scenario.decline_start_week is None
        or week_idx < scenario.decline_start_week
        or scenario.distance_decline_pct_per_week <= 0
    ):
        return 1.0
    weeks_decline = week_idx - scenario.decline_start_week + 1
    return max(
        0.2,
        1.0 - (scenario.distance_decline_pct_per_week / 100.0) * weeks_decline,
    )


def _outings_for_week(scenario: Scenario, week_idx: int) -> int:
    base = scenario.outings_per_day
    start = scenario.outings_decline_start_week
    if start is None or week_idx < start:
        return base
    # Drop ~1 outing every 3 weeks after start, floor at 1.
    weeks_in = week_idx - start
    return max(1, base - 1 - weeks_in // 3)


def _gait_speed_mps(scenario: Scenario, week_idx: int) -> float:
    """Transit speed for this week: base speed, optionally declining after onset."""
    speed = scenario.walk_speed_mps
    start = scenario.speed_decline_start_week
    if start is not None and week_idx >= start and scenario.speed_decline_pct_per_week > 0:
        weeks_in = week_idx - start + 1
        speed *= max(0.6, 1.0 - scenario.speed_decline_pct_per_week / 100.0 * weeks_in)
    return speed


def _fade_factor(scenario: Scenario, week_idx: int) -> float:
    """Return-leg speed multiplier (<1 = slower towards the end of the walk)."""
    start = scenario.speed_decline_start_week
    if scenario.walk_fade_pct > 0 and start is not None and week_idx >= start:
        return 1.0 - scenario.walk_fade_pct / 100.0
    return 1.0


def _places_for_week(
    scenario: Scenario, week_idx: int, rng: random.Random
) -> tuple[NamedPlace, ...]:
    base = scenario.places if scenario.places is not None else DEFAULT_PLACES
    if not scenario.place_repertoire_shrink:
        return base
    start = scenario.place_shrink_start_week
    if start is None:
        # Legacy front-loaded shrink: ~1 place dropped every 2 weeks from the start.
        keep = max(2, len(base) - week_idx // 2)
    elif week_idx < start:
        keep = len(base)
    else:
        # Sharp, recent collapse: drop ~2 places per week after the start week.
        keep = max(1, len(base) - 2 * (week_idx - start + 1))
    return base[:keep]


def _pick_place(
    places: tuple[NamedPlace, ...], day: dt_mod.date, rng: random.Random
) -> NamedPlace | None:
    candidates = [p for p in places if day.weekday() in p.typical_dow]
    rng.shuffle(candidates)
    for p in candidates:
        if rng.random() < p.visit_prob:
            return p
    return None


def _emit_outing(
    rows: list[Any],
    scenario: Scenario,
    place: NamedPlace,
    start_dt: datetime,
    decline_factor: float,
    rng: random.Random,
    week_idx: int,
    gait_rng: random.Random,  # reserved for Task 4 pause draws; threaded here unused
) -> datetime:
    """Emit one outing's GPS fixes. Personas with baked street routes walk real
    OSM streets; everyone else falls back to the geometric arc model."""
    user_route = _routes().get(scenario.user_id)
    if user_route is not None and place.label in user_route.get("places", {}):
        return _emit_outing_routed(
            rows, scenario, place, start_dt, decline_factor, rng, user_route, week_idx, gait_rng
        )
    return _emit_outing_arc(
        rows, scenario, place, start_dt, decline_factor, rng, week_idx, gait_rng
    )


def _emit_outing_routed(
    rows: list[Any],
    scenario: Scenario,
    place: NamedPlace,
    start_dt: datetime,
    decline_factor: float,
    rng: random.Random,
    route: dict[str, Any],
    week_idx: int,
    gait_rng: random.Random,  # reserved for Task 4 pause draws; threaded here unused
) -> datetime:
    """Walk real streets: a near-home block-loop spur pads the distance, then the
    spine carries the user out to the snapped on-street place, dwell, and back.

    The dwell sits at the fixed spine endpoint regardless of distance/decline, so
    the place clusters tightly and its pin stays put; distance and its weekly
    decline come from how much of the loop spur gets walked, not from moving the
    destination — keeping the activity radius small while the path length is large."""
    spine = [(p[0], p[1]) for p in route["places"][place.label]]
    loop = route["loop"]
    spine_len = sum(_haversine_m(spine[i - 1], spine[i]) for i in range(1, len(spine)))

    round_trip_m = max(
        120.0,
        scenario.mean_outing_distance_m * decline_factor * rng.uniform(0.7, 1.3),
    )
    oneway_m = round_trip_m / 2.0

    speed = _gait_speed_mps(scenario, week_idx)
    step_out_s = TRANSIT_STEP_M / speed
    step_back_s = step_out_s / _fade_factor(scenario, week_idx)

    # Pad spur: walk out along the block loop and back, so the spur starts and ends
    # at home and joins the spine seamlessly. Its length tops up the spine to oneway.
    pad_oneway = max(0.0, oneway_m - spine_len)
    spur_out = _resample(loop, TRANSIT_STEP_M, pad_oneway / 2.0)
    spur = spur_out + list(reversed(spur_out))
    spine_pts = _resample(spine, TRANSIT_STEP_M, spine_len)
    if spine_pts[-1] != spine[-1]:
        spine_pts.append(spine[-1])  # land exactly on the snapped destination

    outbound = spur + spine_pts
    dest = spine[-1]

    def emit_ll(lat: float, lon: float, ts: datetime, jitter_m: float) -> None:
        jlat = lat + rng.gauss(0, jitter_m) / METERS_PER_DEG_LAT
        jlon = lon + rng.gauss(0, jitter_m) / (
            METERS_PER_DEG_LAT * math.cos(math.radians(lat))
        )
        rows.append((scenario.user_id, ts, jlat, jlon, rng.uniform(3.0, 8.0)))

    t = start_dt
    for lat, lon in outbound:
        emit_ll(lat, lon, t, 1.5)
        t += timedelta(seconds=step_out_s)

    dwell_min = rng.randint(10, 40)
    for _ in range(dwell_min * 60 // DWELL_SAMPLE_S):
        emit_ll(dest[0], dest[1], t, 0.5)
        t += timedelta(seconds=DWELL_SAMPLE_S)

    for lat, lon in reversed(outbound):
        emit_ll(lat, lon, t, 1.5)
        t += timedelta(seconds=step_back_s)
    return t


def _emit_outing_arc(
    rows: list[Any],
    scenario: Scenario,
    place: NamedPlace,
    start_dt: datetime,
    decline_factor: float,
    rng: random.Random,
    week_idx: int,
    gait_rng: random.Random,  # reserved for Task 4 pause draws; threaded here unused
) -> datetime:
    # Work in a local metre plane centred on home: x = east, y = north.
    east_m = place.lon_offset_m
    north_m = place.lat_offset_m
    straight_m = math.hypot(east_m, north_m)

    round_trip_m = max(
        120.0,
        scenario.mean_outing_distance_m * decline_factor * rng.uniform(0.7, 1.3),
    )
    oneway_m = round_trip_m / 2.0

    speed = _gait_speed_mps(scenario, week_idx)
    step_out_s = TRANSIT_STEP_M / speed
    step_back_s = step_out_s / _fade_factor(scenario, week_idx)

    # Unit perpendicular to the home->place direction (for the route's bow).
    if straight_m < 1.0:
        perp_x, perp_y = 1.0, 0.0
    else:
        perp_x, perp_y = -north_m / straight_m, east_m / straight_m

    # Bow the route sideways so its arc length matches the target one-way distance
    # instead of the (much shorter) straight-line gap to the place.
    half_m = straight_m / 2.0
    amp_sq = (oneway_m / 2.0) ** 2 - half_m**2
    amp_m = math.sqrt(amp_sq) if amp_sq > 0 else straight_m * 0.25
    n_steps = max(4, int(oneway_m / TRANSIT_STEP_M))

    def curve(s: float, sign: float) -> tuple[float, float]:
        """Quadratic Bezier home(0,0) -> bowed control point -> place, at param s."""
        cx = east_m * 0.5 + sign * amp_m * perp_x
        cy = north_m * 0.5 + sign * amp_m * perp_y
        u = 1.0 - s
        x = 2 * u * s * cx + s * s * east_m
        y = 2 * u * s * cy + s * s * north_m
        return x, y

    def emit(x_m: float, y_m: float, ts: datetime, jitter_m: float) -> None:
        lat = scenario.home_lat + _m_to_deg_lat(y_m + rng.gauss(0, jitter_m))
        lon = scenario.home_lon + _m_to_deg_lon(
            x_m + rng.gauss(0, jitter_m), scenario.home_lat
        )
        rows.append((scenario.user_id, ts, lat, lon, rng.uniform(3.0, 8.0)))

    t = start_dt
    out_sign = rng.choice((-1.0, 1.0))

    # Outbound leg: home -> place along a gentle curve.
    for i in range(n_steps + 1):
        x_m, y_m = curve(i / n_steps, out_sign)
        emit(x_m, y_m, t, 1.5)
        t += timedelta(seconds=step_out_s)

    # Dwell at the destination: densely sampled, near-stationary, tightly clustered.
    dwell_min = rng.randint(10, 40)
    for _ in range(dwell_min * 60 // DWELL_SAMPLE_S):
        emit(east_m, north_m, t, 0.5)
        t += timedelta(seconds=DWELL_SAMPLE_S)

    # Return leg: place -> home, bowed the other way so it doesn't overlap the way out.
    for i in range(1, n_steps + 1):
        x_m, y_m = curve(1.0 - i / n_steps, -out_sign)
        emit(x_m, y_m, t, 1.5)
        t += timedelta(seconds=step_back_s)
    return t
