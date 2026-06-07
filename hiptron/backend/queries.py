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
            home_lat = float(home[0]) if home else 0.0
            home_lon = float(home[1]) if home else 0.0
            places = _top_places(con, user_id, home_lat, home_lon)
            schematic = SchematicMap(
                home_lat=home_lat,
                home_lon=home_lon,
                places=places,
                walk_polyline=polyline,
            )

        streak = _streak_days(con, user_id)
        trend = _latest_older_adult_trend_text(con, user_id)
        return OlderAdultHome(
            greeting=_greeting_de(),
            date=today,
            yesterday_walk=yesterday_walk,
            schematic_map=schematic,
            streak_days=streak,
            family_note=None,
            trend_card=trend,
            week_distances=_weekly_distance(con, user_id),
        )
    finally:
        con.close()


def _weekly_distance(
    con: duckdb.DuckDBPyConnection, user_id: str
) -> WeeklyTrend:
    """Last-7-day daily walking distance + 4-week baseline.

    Shared by the relative home trend card and the senior week view.
    """
    ref_row = con.execute(
        "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
    ).fetchone()
    ref_date = ref_row[0] if ref_row and ref_row[0] else dt.date.today()
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
    return WeeklyTrend(
        headline=_trend_headline(points, baseline_mean),
        points=[WeeklyTrendPoint(date=d, value=v or 0.0) for d, v in points],
        baseline_mean=baseline_mean,
    )


_SCHEMATIC_MAX_PLACES = 5
_SCHEMATIC_HOME_RADIUS_M = 60.0


def _top_places(
    con: duckdb.DuckDBPyConnection,
    user_id: str,
    home_lat: float,
    home_lon: float,
) -> list[Place]:
    """The handful of most-visited real places, for a clean schematic map.

    Clustering produces some low-visit noise (and the occasional cluster right on
    top of home); the map only wants the user's genuine everyday spots.
    """
    import math

    rows = con.execute(
        """
        SELECT p.place_id, p.centroid_lat, p.centroid_lon, p.label,
               count(v.walk_id) AS visits
        FROM places p
        LEFT JOIN walk_place_visits v ON v.place_id = p.place_id
        WHERE p.user_id = ?
        GROUP BY p.place_id, p.centroid_lat, p.centroid_lon, p.label
        ORDER BY visits DESC
        """,
        (user_id,),
    ).fetchall()
    places: list[Place] = []
    for pid, lat, lon, label, visits in rows:
        dist_m = math.hypot(
            (lat - home_lat) * 111_320.0,
            (lon - home_lon) * 111_320.0 * math.cos(math.radians(home_lat)),
        )
        if dist_m < _SCHEMATIC_HOME_RADIUS_M:
            continue
        places.append(
            Place(
                place_id=pid,
                label=label,
                centroid_lat=lat,
                centroid_lon=lon,
                visits=int(visits or 0),
            )
        )
        if len(places) >= _SCHEMATIC_MAX_PLACES:
            break
    return places


def _home_latlon(
    con: duckdb.DuckDBPyConnection, user_id: str
) -> tuple[float, float]:
    home = con.execute(
        "SELECT median(lat), median(lon) FROM gps_fixes WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    lat = float(home[0]) if home and home[0] is not None else 0.0
    lon = float(home[1]) if home and home[1] is not None else 0.0
    return lat, lon


def _schematic_from_latest_walk(
    con: duckdb.DuckDBPyConnection, user_id: str
) -> SchematicMap | None:
    """Build a schematic map from the user's most recent walk.

    Relatives now see an approximate route (the older adult's own shared data),
    so reuse the same projection inputs as the older-adult schematic.
    """
    row = con.execute(
        """
        SELECT w.walk_id, w.start_ts, w.end_ts FROM walks w
        WHERE w.user_id = ?
        ORDER BY w.start_ts DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if row is None:
        return None
    _walk_id, start_ts, end_ts = row
    polyline = con.execute(
        """
        SELECT lat, lon FROM gps_fixes
        WHERE user_id = ? AND ts BETWEEN ? AND ?
        ORDER BY ts
        """,
        (user_id, start_ts, end_ts),
    ).fetchall()
    home_lat, home_lon = _home_latlon(con, user_id)
    places = _top_places(con, user_id, home_lat, home_lon)
    return SchematicMap(
        home_lat=home_lat,
        home_lon=home_lon,
        places=places,
        walk_polyline=polyline,
    )


def _recent_outings(
    con: duckdb.DuckDBPyConnection, user_id: str, limit: int = 4
) -> list[WalkSummary]:
    rows = con.execute(
        """
        SELECT w.walk_id, w.start_ts, w.end_ts, wf.distance_m
        FROM walks w
        JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ?
        ORDER BY w.start_ts DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    outings: list[WalkSummary] = []
    for walk_id, start_ts, end_ts, distance in rows:
        visits = con.execute(
            """
            SELECT p.label FROM walk_place_visits v
            JOIN places p ON p.place_id = v.place_id
            WHERE v.walk_id = ?
            """,
            (walk_id,),
        ).fetchall()
        outings.append(
            WalkSummary(
                walk_id=walk_id,
                start_ts=start_ts,
                end_ts=end_ts,
                distance_m=distance,
                place_labels=[v[0] for v in visits],
            )
        )
    return outings


def _greeting_de() -> str:
    h = dt.datetime.now().hour
    if h < 11:
        return "Guten Morgen"
    if h < 18:
        return "Guten Tag"
    return "Guten Abend"


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


ALL_CLEAR_OLDER = "Schöne, gleichmäßige Woche. Weiter so."


def _latest_older_adult_trend_text(con: duckdb.DuckDBPyConnection, user_id: str) -> str:
    row = con.execute(
        """
        SELECT payload_json FROM insights
        WHERE user_id = ? AND audience = 'older_adult'
        ORDER BY created_ts DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not row:
        return ALL_CLEAR_OLDER
    return str(json.loads(row[0])["text"])


def relative_home(db_path: Path, user_id: str) -> RelativeHome:
    con = _con(db_path)
    try:
        # Use the max date in the DB as reference to avoid CURRENT_DATE mismatch
        ref_date_row = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref_date_row[0] if ref_date_row and ref_date_row[0] else dt.date.today()

        weekly = _weekly_distance(con, user_id)

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
                    f"{_feature_de(payload['feature'])}: Mittelwert "
                    f"{payload['baseline_mean']:.1f}, jetzt {payload['current_value']:.1f}."
                ),
                feature=payload["feature"],
            )
        last_update_row = con.execute(
            "SELECT max(ts) FROM gps_fixes WHERE user_id = ?", (user_id,)
        ).fetchone()
        last_update = (last_update_row[0] if last_update_row else None) or dt.datetime.now()

        summary = (
            "Routine wirkt unauffällig." if status == "green"
            else "Diese Woche ist etwas auffällig."
        )
        return RelativeHome(
            status=status,
            last_update=last_update,
            summary=summary,
            weekly_trend=weekly,
            worth_noticing=worth,
            schematic_map=_schematic_from_latest_walk(con, user_id),
            recent_outings=_recent_outings(con, user_id, 4),
            home_label="Zuhause",
        )
    finally:
        con.close()


def _trend_headline(points: list[tuple[Any, Any]], baseline_mean: float) -> str:
    if not points or baseline_mean <= 0:
        return "Noch nicht genug Daten."
    recent = sum((v or 0.0) for _, v in points) / max(1, len(points))
    delta_pct = (recent - baseline_mean) / baseline_mean * 100.0
    if abs(delta_pct) < 5:
        return "Gehstrecke diese Woche stabil."
    if delta_pct < 0:
        return f"Gehstrecke ist ~{abs(delta_pct):.0f}% niedriger als der 4-Wochen-Mittelwert."
    return f"Gehstrecke ist ~{delta_pct:.0f}% höher als der 4-Wochen-Mittelwert."


def _feature_de(feature: str) -> str:
    return {
        "total_distance_m": "Gehstrecke",
        "activity_radius_m": "Aktionsradius",
        "n_outings": "Ausgänge",
        "place_count": "Ortsvielfalt",
    }.get(feature, feature)


def _display_name(user_id: str) -> str:
    return {
        "helga": "Helga",
        "otto": "Otto",
        "margarete": "Margarete",
        "ingrid": "Ingrid",
    }.get(user_id, user_id.capitalize())


def insights_detail(db_path: Path, user_id: str) -> InsightsDetail:
    con = _con(db_path)
    try:
        # Use max date in DB as reference to avoid CURRENT_DATE mismatch
        ref_date_row = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref_date_row[0] if ref_date_row and ref_date_row[0] else dt.date.today()

        blocks: list[InsightBlock] = []
        name = _display_name(user_id)
        chart_data: list[tuple[str, str, Literal["line", "bar", "places", "list"]]] = [
            ("total_distance_m", f"Wie weit geht {name}?", "bar"),
            ("activity_radius_m", "Bleibt der Aktionsradius gleich?", "line"),
            ("n_outings", "Geht sie regelmäßig raus?", "bar"),
            ("place_count", "Wo war sie unterwegs?", "places"),
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
            if feature == "place_count":
                place_rows = con.execute(
                    """
                    SELECT p.label, count(*) AS c
                    FROM walk_place_visits v
                    JOIN places p ON p.place_id = v.place_id
                    JOIN walks w ON w.walk_id = v.walk_id
                    WHERE w.user_id = ?
                      AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 28 DAY
                    GROUP BY p.label
                    ORDER BY c DESC
                    LIMIT 6
                    """,
                    (user_id, ref_date),
                ).fetchall()
                series = [
                    {"label": lbl, "count": int(c)} for lbl, c in place_rows
                ]
            else:
                series = [
                    {"date": str(d), "value": v or 0.0, "baseline": baseline_mean}
                    for d, v in series_rows
                ]
            blocks.append(
                InsightBlock(
                    question=question,
                    verdict=verdict,
                    chart_kind=chart_kind,
                    series=series,
                    hidden=hidden,
                    feature=feature,
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
            "Keine nennenswerten Veränderungen."
            if not cp_rows
            else f"{len(cp_rows)} Veränderungspunkt(e) zuletzt erkannt."
        )
        blocks.append(
            InsightBlock(
                question="Gab es kürzlich Veränderungen?",
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
        return "Noch nicht genug Daten."
    recent_vals = [v for _, v in series[-7:] if v is not None]
    if not recent_vals:
        return "Noch nicht genug Daten."
    recent = sum(recent_vals) / len(recent_vals)
    delta = (recent - baseline_mean) / baseline_mean * 100.0
    name = _feature_de(feature)
    if abs(delta) < 7:
        return f"{name} ist stabil."
    direction = "niedriger" if delta < 0 else "höher"
    return f"{name} ist {abs(delta):.0f}% {direction} als der Mittelwert."
