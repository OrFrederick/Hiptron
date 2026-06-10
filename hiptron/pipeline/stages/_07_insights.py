"""Stage 7 — convert change-points into audience-tagged insight rows."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from typing import Any

import duckdb

TEMPLATES: dict[tuple[str, str, str], tuple[str, str]] = {
    ("total_distance_m", "down", "older_adult"): (
        "distance_down_older",
        "Diese Woche etwas ruhiger unterwegs. Alles in Ordnung.",
    ),
    ("total_distance_m", "down", "relative"): (
        "distance_down_relative",
        "Tägliche Gehstrecke ist etwa {abs_pct_delta:.0f}% niedriger als der 4-Wochen-Mittelwert.",
    ),
    ("activity_radius_m", "down", "older_adult"): (
        "radius_down_older",
        "Diese Woche näher zu Hause geblieben. Pausen sind wichtig.",
    ),
    ("activity_radius_m", "down", "relative"): (
        "radius_down_relative",
        "Aktionsradius ist ~{abs_pct_delta:.0f}% kleiner als sonst.",
    ),
    ("n_outings", "down", "older_adult"): (
        "outings_down_older",
        "Diese Woche etwas weniger draußen. Ganz nach Gefühl.",
    ),
    ("n_outings", "down", "relative"): (
        "outings_down_relative",
        "Geht aktuell ~{abs_pct_delta:.0f}% seltener raus als im 4-Wochen-Mittel.",
    ),
    ("place_count", "down", "older_adult"): (
        "places_older",
        "Ruhigerer Rhythmus diese Woche. Ein kurzer Besuch an einem Lieblingsort tut vielleicht gut.",
    ),
    ("place_count", "down", "relative"): (
        "places_relative",
        "Diese Woche weniger verschiedene Orte besucht als sonst.",
    ),
}


def generate_insights(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("DELETE FROM insights")
    cps = con.execute(
        """
        SELECT user_id, feature, detected_at, direction, score,
               baseline_mean, current_value
        FROM changepoints
        ORDER BY user_id, detected_at
        """
    ).fetchall()
    rows: list[tuple[Any, ...]] = []
    for (
        user_id,
        feature,
        detected_at,
        direction,
        _score,
        baseline_mean,
        current_value,
    ) in cps:
        pct_delta = 0.0
        if baseline_mean:
            pct_delta = (current_value - baseline_mean) / baseline_mean * 100.0
        payload = {
            "feature": feature,
            "direction": direction,
            "baseline_mean": baseline_mean,
            "current_value": current_value,
            "pct_delta": pct_delta,
            "abs_pct_delta": abs(pct_delta),
            "window_weeks": 4,
        }
        for audience in ("older_adult", "relative"):
            key = (feature, direction, audience)
            if key not in TEMPLATES:
                continue
            template_id, template_str = TEMPLATES[key]
            payload_with_text = {**payload, "text": template_str.format(**payload)}
            insight_id = _insight_id(user_id, audience, feature, detected_at)
            rows.append(
                (
                    insight_id,
                    user_id,
                    audience,
                    f"{feature}_{direction}",
                    "notice",
                    template_id,
                    json.dumps(payload_with_text),
                    dt.datetime.combine(detected_at, dt.time(8, 0)),
                    None,
                )
            )
    if rows:
        con.executemany("INSERT INTO insights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)


def _insight_id(user_id: str, audience: str, feature: str, detected_at: dt.date) -> str:
    return hashlib.sha1(
        f"{user_id}|{audience}|{feature}|{detected_at.isoformat()}".encode()
    ).hexdigest()[:16]
