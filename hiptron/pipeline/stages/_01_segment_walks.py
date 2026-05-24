"""Stage 1 — segment GPS fix stream into walks."""
from __future__ import annotations

import hashlib
import math
from datetime import datetime

import duckdb

HOME_RADIUS_M = 50.0
MIN_AWAY_S = 5 * 60
MIN_BACK_S = 5 * 60
MAX_STATIONARY_GAP_S = 10 * 60
MIN_DISTANCE_M = 51.0
MIN_MEAN_SPEED_MS = 0.1


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def segment_walks(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM walks")
    users = [r[0] for r in con.execute("SELECT DISTINCT user_id FROM gps_fixes").fetchall()]
    for user_id in users:
        _segment_user(con, user_id)


def _path_distance_m(fixes: list, start_idx: int, end_idx: int) -> float:
    total = 0.0
    for j in range(start_idx + 1, end_idx + 1):
        _, la, lo = fixes[j - 1]
        _, lb, lob = fixes[j]
        total += _haversine_m(la, lo, lb, lob)
    return total


def _segment_user(con: duckdb.DuckDBPyConnection, user_id: str) -> None:
    fixes = con.execute(
        "SELECT ts, lat, lon FROM gps_fixes WHERE user_id = ? ORDER BY ts",
        (user_id,),
    ).fetchall()
    if len(fixes) < 2:
        return
    home_lat = sorted(f[1] for f in fixes)[len(fixes) // 2]
    home_lon = sorted(f[2] for f in fixes)[len(fixes) // 2]

    walks: list[tuple[str, str, datetime, datetime, int]] = []
    in_walk = False
    walk_start_idx: int | None = None
    last_away_ts: datetime | None = None
    last_away_idx: int | None = None

    for i, (ts, lat, lon) in enumerate(fixes):
        away = _haversine_m(lat, lon, home_lat, home_lon) > HOME_RADIUS_M
        if not in_walk and away:
            in_walk = True
            walk_start_idx = i
            last_away_ts = ts
            last_away_idx = i
        elif in_walk:
            if away:
                last_away_ts = ts
                last_away_idx = i
            else:
                gap = (ts - last_away_ts).total_seconds()
                if gap >= MIN_BACK_S:
                    start_ts = fixes[walk_start_idx][0]
                    end_ts = last_away_ts
                    duration = (end_ts - start_ts).total_seconds()
                    if duration >= MIN_AWAY_S:
                        dist = _path_distance_m(fixes, walk_start_idx, last_away_idx)
                        if dist >= MIN_DISTANCE_M and duration > 0 and dist / duration >= MIN_MEAN_SPEED_MS:
                            walk_id = _walk_id(user_id, start_ts)
                            fix_count = last_away_idx - walk_start_idx + 1
                            walks.append((walk_id, user_id, start_ts, end_ts, fix_count))
                    in_walk = False
                    walk_start_idx = None
                    last_away_ts = None
                    last_away_idx = None

    if in_walk and walk_start_idx is not None and last_away_ts is not None and last_away_idx is not None:
        start_ts = fixes[walk_start_idx][0]
        end_ts = last_away_ts
        duration = (end_ts - start_ts).total_seconds()
        if duration >= MIN_AWAY_S:
            dist = _path_distance_m(fixes, walk_start_idx, last_away_idx)
            if dist >= MIN_DISTANCE_M and duration > 0 and dist / duration >= MIN_MEAN_SPEED_MS:
                walk_id = _walk_id(user_id, start_ts)
                walks.append((walk_id, user_id, start_ts, end_ts, last_away_idx - walk_start_idx + 1))

    if walks:
        con.executemany(
            "INSERT INTO walks VALUES (?, ?, ?, ?, ?)", walks
        )


def _walk_id(user_id: str, start_ts: datetime) -> str:
    h = hashlib.sha1(f"{user_id}|{start_ts.isoformat()}".encode()).hexdigest()
    return h[:16]
