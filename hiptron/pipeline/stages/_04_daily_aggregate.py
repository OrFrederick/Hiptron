"""Stage 4 — roll per-walk features into daily features per user."""
from __future__ import annotations

import duckdb


SQL = """
INSERT INTO daily_features
SELECT
    w.user_id,
    CAST(w.start_ts AS DATE) AS date,
    COALESCE(SUM(wf.distance_m), 0) AS total_distance_m,
    COUNT(DISTINCT w.walk_id) AS n_outings,
    COALESCE(SUM(wf.duration_s), 0) / 60.0 AS time_outdoors_min,
    COALESCE(MAX(wf.distance_m / 2.0), 0) AS activity_radius_m,
    AVG(NULLIF(wf.speed_third_delta_pct, 0)) AS fatigue_index,
    COUNT(DISTINCT v.place_id) AS place_count
FROM walks w
JOIN walk_features wf ON wf.walk_id = w.walk_id
LEFT JOIN walk_place_visits v ON v.walk_id = w.walk_id
GROUP BY w.user_id, CAST(w.start_ts AS DATE)
"""


def aggregate_daily(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM daily_features")
    con.execute(SQL)
