import datetime as dt_mod
import math
import random
from datetime import datetime, timedelta
from typing import Any

import duckdb

from hiptron.synthetic.scenarios import DEFAULT_PLACES, NamedPlace, Scenario

METERS_PER_DEG_LAT = 111_320.0


def _m_to_deg_lat(m: float) -> float:
    return m / METERS_PER_DEG_LAT


def _m_to_deg_lon(m: float, at_lat: float) -> float:
    return m / (METERS_PER_DEG_LAT * math.cos(math.radians(at_lat)))


def generate(scenario: Scenario, con: duckdb.DuckDBPyConnection) -> None:
    """Write synthetic GPS fixes for `scenario` into the `gps_fixes` table."""
    rng = random.Random(scenario.seed)
    rows: list[tuple[str, datetime, float, float, float]] = []

    start = scenario.start().replace(hour=0, minute=0, second=0, microsecond=0)

    cur = start
    end = scenario.end()
    while cur < end:
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

    day = start.date()
    end_date = end.date()
    while day <= end_date:
        week_idx = (day - start.date()).days // 7
        decline_factor = _decline_factor(scenario, week_idx)
        places = _places_for_week(scenario, week_idx, rng)
        for _ in range(scenario.outings_per_day):
            place = _pick_place(places, day, rng)
            if place is None:
                continue
            start_dt = datetime.combine(day, datetime.min.time()) + timedelta(
                hours=place.typical_hour, minutes=rng.randint(-30, 30)
            )
            _emit_outing(rows, scenario, place, start_dt, decline_factor, rng)
        day += timedelta(days=1)

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


def _places_for_week(
    scenario: Scenario, week_idx: int, rng: random.Random
) -> tuple[NamedPlace, ...]:
    if not scenario.place_repertoire_shrink:
        return DEFAULT_PLACES
    keep = max(2, len(DEFAULT_PLACES) - week_idx // 2)
    return DEFAULT_PLACES[:keep]


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
) -> None:
    place_lat = scenario.home_lat + _m_to_deg_lat(place.lat_offset_m)
    place_lon = scenario.home_lon + _m_to_deg_lon(place.lon_offset_m, scenario.home_lat)
    distance_m = max(
        100.0,
        scenario.mean_outing_distance_m * decline_factor * rng.uniform(0.7, 1.3),
    )
    walking_speed = rng.uniform(0.8, 1.1)
    if scenario.fatigue_onset_week is not None:
        walking_speed *= 0.9

    n_steps = max(2, int(distance_m / walking_speed / 5))
    for i in range(n_steps + 1):
        t = i / n_steps
        if t <= 0.5:
            frac = t * 2
        else:
            frac = (1 - t) * 2
        lat = scenario.home_lat + frac * (place_lat - scenario.home_lat)
        lon = scenario.home_lon + frac * (place_lon - scenario.home_lon)
        lat += rng.gauss(0, 1e-5)
        lon += rng.gauss(0, 1e-5)
        ts = start_dt + timedelta(seconds=i * 5)
        rows.append((scenario.user_id, ts, lat, lon, rng.uniform(3.0, 8.0)))

    dwell_min = rng.randint(10, 40)
    for j in range(dwell_min):
        rows.append(
            (
                scenario.user_id,
                start_dt + timedelta(seconds=n_steps * 5 + j * 60),
                place_lat + rng.gauss(0, 1e-5),
                place_lon + rng.gauss(0, 1e-5),
                rng.uniform(3.0, 8.0),
            )
        )
