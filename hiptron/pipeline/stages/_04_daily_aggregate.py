"""Stage 4 — roll per-walk features into daily features per user."""

from __future__ import annotations

import duckdb

SQL = """
INSERT INTO daily_features
WITH home AS (
    SELECT user_id, median(lat) AS hlat, median(lon) AS hlon
    FROM gps_fixes
    GROUP BY user_id
),
daily_base AS (
    SELECT
        w.user_id,
        CAST(w.start_ts AS DATE) AS date,
        COALESCE(SUM(wf.distance_m), 0) AS total_distance_m,
        COUNT(DISTINCT w.walk_id) AS n_outings,
        COALESCE(SUM(wf.duration_s), 0) / 60.0 AS time_outdoors_min,
        AVG(NULLIF(wf.speed_third_delta_pct, 0)) AS fatigue_index,
        COUNT(DISTINCT v.place_id) AS place_count
    FROM walks w
    JOIN walk_features wf ON wf.walk_id = w.walk_id
    LEFT JOIN walk_place_visits v ON v.walk_id = w.walk_id
    GROUP BY w.user_id, CAST(w.start_ts AS DATE)
),
radius AS (
    SELECT
        w.user_id,
        CAST(w.start_ts AS DATE) AS date,
        MAX(
            2 * 6371000 * asin(sqrt(
                pow(sin(radians(g.lat - h.hlat) / 2), 2)
                + cos(radians(h.hlat)) * cos(radians(g.lat))
                  * pow(sin(radians(g.lon - h.hlon) / 2), 2)
            ))
        ) AS activity_radius_m
    FROM walks w
    JOIN gps_fixes g
      ON g.user_id = w.user_id AND g.ts BETWEEN w.start_ts AND w.end_ts
    JOIN home h ON h.user_id = w.user_id
    GROUP BY w.user_id, CAST(w.start_ts AS DATE)
)
SELECT
    b.user_id,
    b.date,
    b.total_distance_m,
    b.n_outings,
    b.time_outdoors_min,
    COALESCE(r.activity_radius_m, 0) AS activity_radius_m,
    b.fatigue_index,
    b.place_count
FROM daily_base b
LEFT JOIN radius r ON r.user_id = b.user_id AND r.date = b.date
"""


def aggregate_daily(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM daily_features")
    con.execute(SQL)
