"""Stage 2 — per-walk feature extraction."""

from __future__ import annotations

import hashlib
import math
from typing import Any

import duckdb

from hiptron.pipeline.stages._01_segment_walks import _haversine_m

PAUSE_SPEED_THRESHOLD = 0.3


def compute_walk_features(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM walk_features")
    walks = con.execute("SELECT walk_id, user_id, start_ts, end_ts FROM walks").fetchall()
    rows: list[tuple[Any, ...]] = []
    for walk_id, user_id, start_ts, end_ts in walks:
        fixes = con.execute(
            """
            SELECT ts, lat, lon
            FROM gps_fixes
            WHERE user_id = ? AND ts BETWEEN ? AND ?
            ORDER BY ts
            """,
            (user_id, start_ts, end_ts),
        ).fetchall()
        if len(fixes) < 2:
            continue
        rows.append(_features_for_walk(walk_id, fixes))
    if rows:
        con.executemany("INSERT INTO walk_features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)


def _features_for_walk(walk_id: str, fixes: list[Any]) -> tuple[Any, ...]:
    total_dist = 0.0
    speeds: list[float] = []
    dwell_s = 0.0
    pause_count = 0
    prev_pause = False

    for i in range(1, len(fixes)):
        ts_a, lat_a, lon_a = fixes[i - 1]
        ts_b, lat_b, lon_b = fixes[i]
        dt = (ts_b - ts_a).total_seconds()
        if dt <= 0:
            continue
        d = _haversine_m(lat_a, lon_a, lat_b, lon_b)
        speed = d / dt
        total_dist += d
        speeds.append(speed)
        if speed < PAUSE_SPEED_THRESHOLD:
            dwell_s += dt
            if not prev_pause:
                pause_count += 1
                prev_pause = True
        else:
            prev_pause = False

    duration_s = (fixes[-1][0] - fixes[0][0]).total_seconds()
    mean_speed = total_dist / duration_s if duration_s > 0 else 0.0
    peak_speed = max(speeds) if speeds else 0.0

    third = max(1, len(speeds) // 3)
    first_third = speeds[:third]
    last_third = speeds[-third:]
    avg_first = sum(first_third) / max(1, len(first_third))
    avg_last = sum(last_third) / max(1, len(last_third))
    speed_third_delta_pct = ((avg_last - avg_first) / avg_first * 100.0) if avg_first > 0 else 0.0

    route_hash = _route_hash(fixes)
    return (
        walk_id,
        total_dist,
        duration_s,
        mean_speed,
        peak_speed,
        pause_count,
        dwell_s,
        speed_third_delta_pct,
        route_hash,
    )


def _route_hash(fixes: list[Any], grid_m: float = 100.0) -> str:
    """Cheap route fingerprint: bucket-sequence of (lat, lon) on a coarse grid."""
    if not fixes:
        return ""
    base_lat = fixes[0][1]
    base_lon = fixes[0][2]
    deg_per_m_lat = 1 / 111_320.0
    deg_per_m_lon = 1 / (111_320.0 * math.cos(math.radians(base_lat)))
    tokens = []
    last = None
    for _, lat, lon in fixes:
        gy = int((lat - base_lat) / (grid_m * deg_per_m_lat))
        gx = int((lon - base_lon) / (grid_m * deg_per_m_lon))
        token = (gx, gy)
        if token != last:
            tokens.append(token)
            last = token
    return hashlib.sha1(repr(tokens).encode()).hexdigest()[:16]
