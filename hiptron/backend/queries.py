from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from typing import Any, Literal

import duckdb

from hiptron.backend.models import (
    InsightBlock,
    InsightsDetail,
    OlderAdultHome,
    Place,
    RelativeHome,
    SchematicMap,
    WalkSummary,
    WeeklyTrend,
    WeeklyTrendPoint,
    WorthNoticing,
)
from hiptron.db.connection import open_db


def _con(db_path: Path) -> duckdb.DuckDBPyConnection:
    return open_db(db_path, read_only=True)


def older_adult_home(db_path: Path, user_id: str) -> OlderAdultHome:
    con = _con(db_path)
    try:
        today = dt.date.today()
        yesterday = today - dt.timedelta(days=1)

        walk_row = con.execute(
            """
            SELECT w.walk_id, w.start_ts, w.end_ts, wf.distance_m
            FROM walks w
            JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = ?
              AND CAST(w.start_ts AS DATE) = ?
            ORDER BY wf.distance_m DESC
            LIMIT 1
            """,
            (user_id, yesterday),
        ).fetchone()
        if walk_row is None:
            walk_row = con.execute(
                """
                SELECT w.walk_id, w.start_ts, w.end_ts, wf.distance_m
                FROM walks w
                JOIN walk_features wf ON wf.walk_id = w.walk_id
                WHERE w.user_id = ?
                ORDER BY w.start_ts DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()

        yesterday_walk = None
        schematic = None
        if walk_row:
            walk_id, start_ts, end_ts, distance = walk_row
            visits = con.execute(
                """
                SELECT p.label FROM walk_place_visits v
                JOIN places p ON p.place_id = v.place_id
                WHERE v.walk_id = ?
                """,
                (walk_id,),
            ).fetchall()
            place_labels = [v[0] for v in visits]
            yesterday_walk = WalkSummary(
                walk_id=walk_id,
                start_ts=start_ts,
                end_ts=end_ts,
                distance_m=distance,
                place_labels=place_labels,
            )
            polyline = con.execute(
                """
                SELECT lat, lon FROM gps_fixes
                WHERE user_id = ? AND ts BETWEEN ? AND ?
                ORDER BY ts
                """,
                (user_id, start_ts, end_ts),
            ).fetchall()
            home = con.execute(
                "SELECT median(lat), median(lon) FROM gps_fixes WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            places = [
                Place(place_id=pid, label=lab, centroid_lat=lat, centroid_lon=lon)
                for pid, lat, lon, lab in con.execute(
                    """
                    SELECT place_id, centroid_lat, centroid_lon, label
                    FROM places WHERE user_id = ?
                    """,
                    (user_id,),
                ).fetchall()
            ]
            home_lat = float(home[0]) if home else 0.0
            home_lon = float(home[1]) if home else 0.0
            schematic = SchematicMap(
                home_lat=home_lat,
                home_lon=home_lon,
                places=places,
                walk_polyline=polyline,
            )

        streak = _streak_days(con, user_id)
        trend = _latest_older_adult_trend_text(con, user_id)
        return OlderAdultHome(
            greeting="Good morning",
            date=today,
            yesterday_walk=yesterday_walk,
            schematic_map=schematic,
            streak_days=streak,
            family_note=None,
            trend_card=trend,
        )
    finally:
        con.close()


def _streak_days(con: duckdb.DuckDBPyConnection, user_id: str) -> int:
    rows = con.execute(
        """
        SELECT date FROM daily_features
        WHERE user_id = ? AND n_outings > 0
        ORDER BY date DESC
        """,
        (user_id,),
    ).fetchall()
    streak = 0
    expected = dt.date.today()
    for (d,) in rows:
        if d == expected or d == expected - dt.timedelta(days=1):
            streak += 1
            expected = d - dt.timedelta(days=1)
        else:
            break
    return streak


def _latest_older_adult_trend_text(con: duckdb.DuckDBPyConnection, user_id: str) -> str | None:
    row = con.execute(
        """
        SELECT payload_json FROM insights
        WHERE user_id = ? AND audience = 'older_adult'
        ORDER BY created_ts DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not row:
        return None
    return str(json.loads(row[0])["text"])


def relative_home(db_path: Path, user_id: str) -> RelativeHome:
    con = _con(db_path)
    try:
        # Use the max date in the DB as reference to avoid CURRENT_DATE mismatch
        ref_date_row = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref_date_row[0] if ref_date_row and ref_date_row[0] else dt.date.today()

        points = con.execute(
            """
            SELECT date, total_distance_m FROM daily_features
            WHERE user_id = ? AND date >= ? - INTERVAL 7 DAY
            ORDER BY date
            """,
            (user_id, ref_date),
        ).fetchall()
        baseline = con.execute(
            """
            SELECT mean FROM baselines
            WHERE user_id = ? AND feature = 'total_distance_m'
            ORDER BY window_end DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        baseline_mean = float(baseline[0]) if baseline else 0.0
        weekly = WeeklyTrend(
            headline=_trend_headline(points, baseline_mean),
            points=[WeeklyTrendPoint(date=d, value=v or 0.0) for d, v in points],
            baseline_mean=baseline_mean,
        )

        latest_cp = con.execute(
            """
            SELECT payload_json FROM insights
            WHERE user_id = ? AND audience = 'relative'
              AND created_ts >= ? - INTERVAL 14 DAY
            ORDER BY created_ts DESC LIMIT 1
            """,
            (user_id, dt.datetime.combine(ref_date, dt.time(0, 0))),
        ).fetchone()
        worth = None
        status: Literal["green", "amber"] = "green"
        if latest_cp:
            payload = json.loads(latest_cp[0])
            status = "amber"
            worth = WorthNoticing(
                headline=payload["text"],
                detail=(
                    f"{payload['feature']} change: baseline "
                    f"{payload['baseline_mean']:.1f}, now {payload['current_value']:.1f}."
                ),
                feature=payload["feature"],
            )
        last_update_row = con.execute(
            "SELECT max(ts) FROM gps_fixes WHERE user_id = ?", (user_id,)
        ).fetchone()
        last_update = (last_update_row[0] if last_update_row else None) or dt.datetime.now()

        summary = "Routine looks normal." if status == "green" else "Worth noticing this week."
        return RelativeHome(
            status=status,
            last_update=last_update,
            summary=summary,
            weekly_trend=weekly,
            worth_noticing=worth,
        )
    finally:
        con.close()


def _trend_headline(points: list[tuple[Any, Any]], baseline_mean: float) -> str:
    if not points or baseline_mean <= 0:
        return "Not enough data yet."
    recent = sum((v or 0.0) for _, v in points) / max(1, len(points))
    delta_pct = (recent - baseline_mean) / baseline_mean * 100.0
    if abs(delta_pct) < 5:
        return "Walking distance steady this week."
    if delta_pct < 0:
        return f"Walking distance is ~{abs(delta_pct):.0f}% lower than the 4-week baseline."
    return f"Walking distance is ~{delta_pct:.0f}% higher than the 4-week baseline."


def insights_detail(db_path: Path, user_id: str) -> InsightsDetail:
    con = _con(db_path)
    try:
        # Use max date in DB as reference to avoid CURRENT_DATE mismatch
        ref_date_row = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref_date_row[0] if ref_date_row and ref_date_row[0] else dt.date.today()

        blocks: list[InsightBlock] = []
        chart_data: list[tuple[str, str, Literal["line", "bar", "places", "list"]]] = [
            ("total_distance_m", "How far is Helga going?", "bar"),
            ("activity_radius_m", "Is the daily routine holding?", "line"),
            ("fatigue_index", "Are walks getting harder?", "line"),
            ("place_count", "Where has she been?", "places"),
        ]
        for feature, question, chart_kind in chart_data:
            series_rows = con.execute(
                f"""
                SELECT date, {feature} FROM daily_features
                WHERE user_id = ? AND date >= ? - INTERVAL 28 DAY
                ORDER BY date
                """,
                (user_id, ref_date),
            ).fetchall()
            baseline = con.execute(
                """
                SELECT mean FROM baselines
                WHERE user_id = ? AND feature = ?
                ORDER BY window_end DESC LIMIT 1
                """,
                (user_id, feature),
            ).fetchone()
            baseline_mean = float(baseline[0]) if baseline else 0.0
            verdict = _block_verdict(feature, series_rows, baseline_mean)
            hidden = len(series_rows) < 14
            blocks.append(
                InsightBlock(
                    question=question,
                    verdict=verdict,
                    chart_kind=chart_kind,
                    series=[
                        {"date": str(d), "value": v or 0.0, "baseline": baseline_mean}
                        for d, v in series_rows
                    ],
                    hidden=hidden,
                )
            )

        cp_rows = con.execute(
            """
            SELECT feature, detected_at, direction, baseline_mean, current_value
            FROM changepoints
            WHERE user_id = ?
            ORDER BY detected_at DESC LIMIT 10
            """,
            (user_id,),
        ).fetchall()
        cp_verdict = (
            "Nothing has changed enough to mention."
            if not cp_rows
            else f"{len(cp_rows)} change-point(s) detected recently."
        )
        blocks.append(
            InsightBlock(
                question="Any change-points lately?",
                verdict=cp_verdict,
                chart_kind="list",
                series=[
                    {
                        "feature": f,
                        "detected_at": str(d),
                        "direction": dr,
                        "baseline_mean": bm,
                        "current_value": cv,
                    }
                    for f, d, dr, bm, cv in cp_rows
                ],
                hidden=False,
            )
        )
        return InsightsDetail(user_id=user_id, blocks=blocks)
    finally:
        con.close()


def _block_verdict(feature: str, series: list[tuple[Any, Any]], baseline_mean: float) -> str:
    if not series or baseline_mean <= 0:
        return "Not enough data yet."
    recent_vals = [v for _, v in series[-7:] if v is not None]
    if not recent_vals:
        return "Not enough data yet."
    recent = sum(recent_vals) / len(recent_vals)
    delta = (recent - baseline_mean) / baseline_mean * 100.0
    name = {
        "total_distance_m": "distance",
        "activity_radius_m": "activity radius",
        "fatigue_index": "fatigue signal",
        "place_count": "place variety",
    }[feature]
    if abs(delta) < 7:
        return f"{name.capitalize()} is steady."
    direction = "down" if delta < 0 else "up"
    return f"{name.capitalize()} is {abs(delta):.0f}% {direction} vs. baseline."
