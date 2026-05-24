"""Stage 5 — rolling 4-week mean+std per (user, feature)."""
from __future__ import annotations

import datetime as dt

import duckdb

TRACKED_FEATURES = (
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
)
WINDOW_DAYS = 28
COLD_START_DAYS = 28


def update_baselines(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM baselines")
    users = [
        r[0] for r in con.execute(
            "SELECT DISTINCT user_id FROM daily_features"
        ).fetchall()
    ]
    rows: list[tuple] = []
    for user_id in users:
        date_range = con.execute(
            "SELECT min(date), max(date) FROM daily_features WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not date_range or not date_range[0]:
            continue
        first_date, last_date = date_range
        cur = first_date + dt.timedelta(days=COLD_START_DAYS - 1)
        while cur <= last_date:
            window_start = cur - dt.timedelta(days=WINDOW_DAYS - 1)
            for feature in TRACKED_FEATURES:
                stats = con.execute(
                    f"""
                    SELECT avg({feature}), stddev_pop({feature}), count(*)
                    FROM daily_features
                    WHERE user_id = ?
                      AND date BETWEEN ? AND ?
                      AND {feature} IS NOT NULL
                    """,
                    (user_id, window_start, cur),
                ).fetchone()
                if stats and stats[2] and stats[2] >= 14:
                    rows.append((
                        user_id, feature, cur,
                        float(stats[0]), float(stats[1] or 0.0), int(stats[2]),
                    ))
            cur += dt.timedelta(days=1)
    if rows:
        con.executemany(
            "INSERT INTO baselines VALUES (?, ?, ?, ?, ?, ?)", rows
        )
