"""Stage 3 — cluster dwell points into named places."""

from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from datetime import datetime
from typing import Any

import duckdb
import numpy as np
from sklearn.cluster import DBSCAN

DWELL_MIN_S = 120
EPS_M = 50.0
MIN_SAMPLES = 3
DEG_PER_M_LAT = 1 / 111_320.0


def cluster_places(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM places")
    con.execute("DELETE FROM walk_place_visits")

    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM gps_fixes").fetchall()]
    for user_id in users:
        _cluster_user(con, user_id)


def _cluster_user(con: duckdb.DuckDBPyConnection, user_id: str) -> None:
    walks = con.execute(
        "SELECT walk_id, start_ts, end_ts FROM walks WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    if not walks:
        return

    dwell_points: list[tuple[str, float, float, datetime, datetime]] = []
    for walk_id, start_ts, end_ts in walks:
        fixes = con.execute(
            """
            SELECT ts, lat, lon FROM gps_fixes
            WHERE user_id = ? AND ts BETWEEN ? AND ?
            ORDER BY ts
            """,
            (user_id, start_ts, end_ts),
        ).fetchall()
        dwell_points.extend(_dwell_segments_for_walk(walk_id, fixes))

    if len(dwell_points) < MIN_SAMPLES:
        return

    coords = np.array([[p[1], p[2]] for p in dwell_points])
    lat0 = coords[:, 0].mean()
    eps_deg = EPS_M * DEG_PER_M_LAT
    coords_scaled = np.column_stack(
        [
            coords[:, 0],
            coords[:, 1] * math.cos(math.radians(lat0)),
        ]
    )
    labels = DBSCAN(eps=eps_deg, min_samples=MIN_SAMPLES).fit_predict(coords_scaled)

    cluster_to_points: dict[int, list[int]] = defaultdict(list)
    for idx, lab in enumerate(labels):
        if lab >= 0:
            cluster_to_points[int(lab)].append(idx)

    place_rows = []
    visit_rows = []
    for _lab, idxs in cluster_to_points.items():
        cluster_coords = coords[idxs]
        centroid_lat = float(cluster_coords[:, 0].mean())
        centroid_lon = float(cluster_coords[:, 1].mean())
        timestamps = [dwell_points[i][3] for i in idxs]
        first_seen = min(timestamps)
        last_seen = max(timestamps)
        place_id = _place_id(user_id, centroid_lat, centroid_lon)
        label = _auto_label([dwell_points[i] for i in idxs])
        place_rows.append(
            (
                place_id,
                user_id,
                centroid_lat,
                centroid_lon,
                label,
                first_seen,
                last_seen,
            )
        )
        for i in idxs:
            walk_id, _lat, _lon, arrive_ts, depart_ts = dwell_points[i]
            visit_rows.append((walk_id, place_id, arrive_ts, depart_ts))

    if place_rows:
        con.executemany("INSERT INTO places VALUES (?, ?, ?, ?, ?, ?, ?)", place_rows)
    if visit_rows:
        con.executemany("INSERT INTO walk_place_visits VALUES (?, ?, ?, ?)", visit_rows)


def _dwell_segments_for_walk(walk_id: str, fixes: list[Any]) -> list[tuple[Any, ...]]:
    """Find sub-segments where the user was stationary >= DWELL_MIN_S."""
    from hiptron.pipeline.stages._01_segment_walks import _haversine_m

    segments = []
    seg_start = None
    seg_start_ts = None
    for i in range(1, len(fixes)):
        ts_a, lat_a, lon_a = fixes[i - 1]
        ts_b, lat_b, lon_b = fixes[i]
        dist = _haversine_m(lat_a, lon_a, lat_b, lon_b)
        if dist < 10.0:
            if seg_start is None:
                seg_start = i - 1
                seg_start_ts = ts_a
        else:
            if seg_start is not None:
                seg_end_ts = ts_a
                if (seg_end_ts - seg_start_ts).total_seconds() >= DWELL_MIN_S:
                    lats = [fixes[j][1] for j in range(seg_start, i)]
                    lons = [fixes[j][2] for j in range(seg_start, i)]
                    segments.append(
                        (
                            walk_id,
                            sum(lats) / len(lats),
                            sum(lons) / len(lons),
                            seg_start_ts,
                            seg_end_ts,
                        )
                    )
                seg_start = None
                seg_start_ts = None
    return segments


def _place_id(user_id: str, lat: float, lon: float) -> str:
    return hashlib.sha1(f"{user_id}|{lat:.5f}|{lon:.5f}".encode()).hexdigest()[:16]


def _auto_label(points: list[tuple[Any, ...]]) -> str:
    hours = [p[3].hour for p in points]
    weekdays = [p[3].weekday() for p in points]
    avg_hour = sum(hours) / len(hours)
    weekday_share = sum(1 for w in weekdays if w < 5) / len(weekdays)
    if avg_hour < 11 and weekday_share > 0.6:
        return "bakery"
    if 13 <= avg_hour <= 16:
        return "park"
    if 10 <= avg_hour <= 12 and weekday_share > 0.7:
        return "doctor"
    if avg_hour > 14 and weekday_share < 0.5:
        return "friend"
    return f"place_{int(avg_hour):02d}h"
