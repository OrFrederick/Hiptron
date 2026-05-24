"""Stage 6 — CUSUM change-point detection vs rolling baseline."""
from __future__ import annotations

import datetime as dt

import duckdb

TRACKED_FEATURES = (
    "total_distance_m",
    "activity_radius_m",
    "fatigue_index",
    "place_count",
)
SUSTAINED_DAYS = 4
THRESHOLD_SIGMAS = 1.9
THRESHOLD_SIGMAS_UP = 4.5


def detect_changepoints(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM changepoints")
    users = [
        r[0] for r in con.execute(
            "SELECT DISTINCT user_id FROM daily_features"
        ).fetchall()
    ]
    rows: list[tuple] = []
    for user_id in users:
        for feature in TRACKED_FEATURES:
            rows.extend(_cusum_for(con, user_id, feature))
    if rows:
        con.executemany(
            "INSERT INTO changepoints VALUES (?, ?, ?, ?, ?, ?, ?)", rows
        )


def _cusum_for(
    con: duckdb.DuckDBPyConnection, user_id: str, feature: str
) -> list[tuple]:
    series = con.execute(
        f"""
        SELECT d.date, d.{feature}, b.mean, b.std
        FROM daily_features d
        LEFT JOIN baselines b
               ON b.user_id = d.user_id
              AND b.feature = ?
              AND b.window_end = d.date - INTERVAL 1 DAY
        WHERE d.user_id = ?
          AND d.{feature} IS NOT NULL
        ORDER BY d.date
        """,
        (feature, user_id),
    ).fetchall()

    pos = 0.0
    neg = 0.0
    sustained_down = 0
    sustained_up = 0
    detections: list[tuple] = []
    last_fired: dt.date | None = None
    for date, value, mean, std in series:
        if mean is None or std is None or std <= 0:
            pos = neg = 0.0
            sustained_down = sustained_up = 0
            continue
        z = (value - mean) / std
        pos = max(0.0, pos + z - 0.5)
        neg = min(0.0, neg + z + 0.5)
        if z < -0.5:
            sustained_down += 1
        else:
            sustained_down = 0
        if z > 0.5:
            sustained_up += 1
        else:
            sustained_up = 0

        if (
            neg < -THRESHOLD_SIGMAS
            and sustained_down >= SUSTAINED_DAYS
            and (last_fired is None or (date - last_fired).days > 14)
        ):
            detections.append(
                (user_id, feature, date, "down", abs(neg), mean, value)
            )
            last_fired = date
            pos = neg = 0.0
            sustained_down = 0
        elif (
            pos > THRESHOLD_SIGMAS_UP
            and sustained_up >= SUSTAINED_DAYS
            and (last_fired is None or (date - last_fired).days > 14)
        ):
            detections.append(
                (user_id, feature, date, "up", pos, mean, value)
            )
            last_fired = date
            pos = neg = 0.0
            sustained_up = 0
    return detections
