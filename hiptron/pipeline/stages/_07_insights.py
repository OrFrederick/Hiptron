"""Stage 7 — convert change-points into audience-tagged insight rows."""
from __future__ import annotations

import datetime as dt
import hashlib
import json

import duckdb

TEMPLATES: dict[tuple[str, str, str], tuple[str, str]] = {
    ("total_distance_m", "down", "older_adult"): (
        "distance_down_older",
        "You've been taking it easier this week — that's okay.",
    ),
    ("total_distance_m", "down", "relative"): (
        "distance_down_relative",
        "Daily walking distance is about {pct_delta:.0f}% lower than the 4-week baseline.",
    ),
    ("activity_radius_m", "down", "older_adult"): (
        "radius_down_older",
        "Staying closer to home this week. That's fine — rest matters.",
    ),
    ("activity_radius_m", "down", "relative"): (
        "radius_down_relative",
        "Activity radius has dropped ~{pct_delta:.0f}% vs. the baseline.",
    ),
    ("fatigue_index", "down", "older_adult"): (
        "fatigue_older",
        "Walks feel a little harder lately — that's normal sometimes.",
    ),
    ("fatigue_index", "down", "relative"): (
        "fatigue_relative",
        "Within-walk fatigue signal up: end-of-walk speed ~{pct_delta:.0f}% lower than start.",
    ),
    ("place_count", "down", "older_adult"): (
        "places_older",
        "Quieter rhythm this week. A short trip to a favourite spot might feel nice.",
    ),
    ("place_count", "down", "relative"): (
        "places_relative",
        "Fewer distinct places visited this week than usual.",
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
    rows: list[tuple] = []
    for (
        user_id, feature, detected_at, direction, score,
        baseline_mean, current_value,
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
            "window_weeks": 4,
        }
        for audience in ("older_adult", "relative"):
            key = (feature, direction, audience)
            if key not in TEMPLATES:
                continue
            template_id, template_str = TEMPLATES[key]
            payload_with_text = {**payload, "text": template_str.format(**payload)}
            insight_id = _insight_id(user_id, audience, feature, detected_at)
            rows.append((
                insight_id, user_id, audience,
                f"{feature}_{direction}", "notice",
                template_id, json.dumps(payload_with_text),
                dt.datetime.combine(detected_at, dt.time(8, 0)),
                None,
            ))
    if rows:
        con.executemany(
            "INSERT INTO insights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", rows
        )


def _insight_id(
    user_id: str, audience: str, feature: str, detected_at: dt.date
) -> str:
    return hashlib.sha1(
        f"{user_id}|{audience}|{feature}|{detected_at.isoformat()}".encode()
    ).hexdigest()[:16]
