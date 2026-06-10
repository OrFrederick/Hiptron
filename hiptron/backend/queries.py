from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from typing import Any, Literal

import duckdb

from hiptron.backend.models import (
    Highlight,
    InsightBlock,
    InsightsDetail,
    MonthlyDelta,
    OlderAdultHome,
    PatternsScreen,
    PauseStats,
    Place,
    RelativeHome,
    Rhythm,
    RhythmBucket,
    RoutineScore,
    SchematicMap,
    SpeedPoint,
    TimeOutdoors,
    WalkFade,
    WalkingSpeed,
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
            polyline = _walk_polyline(con, user_id, start_ts, end_ts)
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
        ref_row = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref_row[0] if ref_row and ref_row[0] else dt.date.today()
        cp = _recent_relative_changepoint(con, user_id, ref_date)
        oa_status: Literal["green", "amber"] = "amber" if cp else "green"
        return OlderAdultHome(
            greeting=_greeting_de(),
            date=today,
            yesterday_walk=yesterday_walk,
            schematic_map=schematic,
            streak_days=streak,
            family_note=None,
            trend_card=trend,
            week_distances=_weekly_distance(con, user_id),
            highlight=_highlight(con, user_id, ref_date),
            status=oa_status,
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

# The walk segmenter only counts fixes outside its 50 m home radius, so a walk's
# start_ts/end_ts exclude the doorstep leg. Pad the fix query so the drawn route
# reaches the home pin instead of floating ~50-70 m away. Outings are spaced
# >= 15 min apart, so 2 min never bleeds into a neighbouring walk.
_POLYLINE_PAD = dt.timedelta(minutes=2)


def _walk_polyline(
    con: duckdb.DuckDBPyConnection,
    user_id: str,
    start_ts: dt.datetime,
    end_ts: dt.datetime,
) -> list[tuple[float, float]]:
    return con.execute(
        """
        SELECT lat, lon FROM gps_fixes
        WHERE user_id = ? AND ts BETWEEN ? AND ?
        ORDER BY ts
        """,
        (user_id, start_ts - _POLYLINE_PAD, end_ts + _POLYLINE_PAD),
    ).fetchall()


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
    polyline = _walk_polyline(con, user_id, start_ts, end_ts)
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


def _recent_relative_changepoint(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> dict[str, Any] | None:
    """Return the parsed payload of the most recent relative-audience insight
    within 14 days of *ref_date*, or None if there is none."""
    row = con.execute(
        """
        SELECT payload_json FROM insights
        WHERE user_id = ? AND audience = 'relative'
          AND created_ts >= ? - INTERVAL 14 DAY
        ORDER BY created_ts DESC LIMIT 1
        """,
        (user_id, dt.datetime.combine(ref_date, dt.time(0, 0))),
    ).fetchone()
    return json.loads(row[0]) if row else None


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

        payload = _recent_relative_changepoint(con, user_id, ref_date)
        worth = None
        status: Literal["green", "amber"] = "green"
        if payload:
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


def _pronoun(user_id: str) -> str:
    # Persona-aware subject pronoun for insight questions ("Geht sie/er raus?").
    return {"otto": "er"}.get(user_id, "sie")


_WEEKDAYS_DE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


def _de_num(x: float, decimals: int = 1) -> str:
    return f"{x:.{decimals}f}".replace(".", ",")


def _fmt_minutes(total_min: float) -> str:
    m = int(round(total_min))
    h, mm = divmod(m, 60)
    if h and mm:
        return f"{h} Std {mm} Min"
    if h:
        return f"{h} Std"
    return f"{mm} Min"


def _highlights(con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date) -> list[Highlight]:
    out: list[Highlight] = []
    lw = con.execute(
        """
        SELECT wf.distance_m, w.start_ts
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 7 DAY
        ORDER BY wf.distance_m DESC LIMIT 1
        """,
        (user_id, ref_date),
    ).fetchone()
    if lw and lw[0]:
        day = _WEEKDAYS_DE[lw[1].weekday()]
        out.append(Highlight(kind="longest_walk", text="Dein längster Spaziergang diese Woche.",
                             detail=f"{_de_num(lw[0] / 1000.0)} km · {day}"))
    # "furthest" (max activity_radius_m) dropped: ~200m flat across all personas in this
    # data → reads broken/identical and adds no novelty. Highlights = longest walk + new place.
    np = con.execute(
        """
        SELECT label FROM places
        WHERE user_id = ? AND label IS NOT NULL
          AND CAST(first_seen AS DATE) >= ? - INTERVAL 7 DAY
        ORDER BY first_seen DESC LIMIT 1
        """,
        (user_id, ref_date),
    ).fetchone()
    if np and np[0]:
        out.append(Highlight(kind="new_place", text="Neuer Ort entdeckt.", detail=str(np[0])))
    return out


# OA gets ONE celebratory card. A new place always earns it; a "longest walk" only
# does when it clears this floor — else celebrating e.g. helga's 0,4 km reads as faint
# praise for a declining week, so the card is omitted (a missing card beats a hollow one).
_OA_HIGHLIGHT_MIN_WALK_M = 600.0


def _highlight(con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date) -> Highlight | None:
    by_kind = {h.kind: h for h in _highlights(con, user_id, ref_date)}
    if "new_place" in by_kind:
        return by_kind["new_place"]
    if "longest_walk" in by_kind:
        d = con.execute(
            """
            SELECT max(wf.distance_m)
            FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
            WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 7 DAY
            """,
            (user_id, ref_date),
        ).fetchone()
        if d and d[0] and d[0] >= _OA_HIGHLIGHT_MIN_WALK_M:
            return by_kind["longest_walk"]
    return None


def _rhythm(con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date) -> Rhythm | None:
    rows = con.execute(
        """
        SELECT EXTRACT(HOUR FROM start_ts) AS h, count(*) AS c
        FROM walks
        WHERE user_id = ? AND CAST(start_ts AS DATE) >= ? - INTERVAL 28 DAY
        GROUP BY h
        """,
        (user_id, ref_date),
    ).fetchall()
    total = sum(int(c) for _, c in rows)
    if total < 8:
        return None
    m = sum(int(c) for h, c in rows if h < 12)
    a = sum(int(c) for h, c in rows if 12 <= h < 18)
    e = sum(int(c) for h, c in rows if h >= 18)
    buckets = [
        RhythmBucket(label="Vormittags", share=m / total),
        RhythmBucket(label="Nachmittags", share=a / total),
        RhythmBucket(label="Abends", share=e / total),
    ]
    top = max(buckets, key=lambda b: b.share)
    # Drop empty buckets (e.g. seniors rarely out "Abends") — a dead 0% bar reads as
    # missing data, not as a real pattern. Remaining shares still sum to 1.
    buckets = [b for b in buckets if b.share > 0]
    sentence = (
        f"Meist {top.label.lower()} unterwegs."
        if top.share >= 0.45
        else "Zu unterschiedlichen Tageszeiten unterwegs."
    )
    return Rhythm(buckets=buckets, sentence=sentence)


_MONTHLY_FEATURES = ("total_distance_m", "activity_radius_m", "n_outings", "place_count")


def _monthly_deltas(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> list[MonthlyDelta]:
    out: list[MonthlyDelta] = []
    for f in _MONTHLY_FEATURES:
        row = con.execute(
            f"""
            SELECT
              avg(CASE WHEN date > ? - INTERVAL 28 DAY THEN {f} END) AS this_v,
              avg(CASE WHEN date <= ? - INTERVAL 28 DAY
                        AND date > ? - INTERVAL 56 DAY THEN {f} END) AS prior_v
            FROM daily_features
            WHERE user_id = ? AND date > ? - INTERVAL 56 DAY
            """,
            (ref_date, ref_date, ref_date, user_id, ref_date),
        ).fetchone()
        if row is None:
            continue
        this_v, prior_v = row
        if this_v is None or prior_v is None or prior_v == 0:
            continue
        pct = (this_v - prior_v) / prior_v * 100.0
        # <10% month-to-month is everyday noise → "etwa gleich", not a directional arrow.
        direction: Literal["up", "down", "flat"] = (
            "flat" if abs(pct) < 10 else ("up" if pct > 0 else "down")
        )
        out.append(
            MonthlyDelta(
                feature=f,
                label=_feature_de(f),
                this_value=float(this_v),
                prior_value=float(prior_v),
                pct_delta=float(pct),
                direction=direction,
            )
        )
    return out


def _routine(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> RoutineScore | None:
    base = con.execute(
        """
        SELECT count(*) AS n, stddev_pop(EXTRACT(HOUR FROM start_ts)) AS sd
        FROM walks
        WHERE user_id = ? AND CAST(start_ts AS DATE) >= ? - INTERVAL 28 DAY
        """,
        (user_id, ref_date),
    ).fetchone()
    if base is None:
        return None
    n = int(base[0] or 0)
    if n < 10:
        return None
    sd = float(base[1]) if base[1] is not None else 0.0
    reg = con.execute(
        """
        WITH v AS (
          SELECT p.place_id, count(*) AS c
          FROM walk_place_visits wv
          JOIN places p ON p.place_id = wv.place_id
          JOIN walks w ON w.walk_id = wv.walk_id
          WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) >= ? - INTERVAL 28 DAY
          GROUP BY p.place_id
        )
        SELECT coalesce(sum(CASE WHEN c >= 3 THEN c END), 0), coalesce(sum(c), 0) FROM v
        """,
        (user_id, ref_date),
    ).fetchone()
    if reg is None:
        return None
    regular, total = float(reg[0]), float(reg[1])
    reg_ratio = (regular / total) if total else 0.0
    # divisor 6.0 tuned so ingrid (sd≈2.5h, reg_ratio≈0.99) scores ≥60 → stabil
    time_score = max(0.0, min(1.0, 1.0 - sd / 6.0))
    score = int(round(100 * (0.7 * time_score + 0.3 * reg_ratio)))
    band: Literal["stabil", "wechselnd"] = "stabil" if score >= 60 else "wechselnd"
    sentence = (
        "Geht meist zu ähnlichen Zeiten und an vertraute Orte."
        if band == "stabil"
        else "Geht zu wechselnden Zeiten und Orten. Abwechslungsreich."
    )
    return RoutineScore(score=score, band=band, sentence=sentence)


def _time_outdoors(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> TimeOutdoors | None:
    # Tier-1 "minutes away from home" metric (catalog: D · M). Warm daily reassurance,
    # NOT a gait/health signal. Pure read-side over daily_features.time_outdoors_min.
    row = con.execute(
        """
        SELECT
          avg(CASE WHEN date > ? - INTERVAL 28 DAY THEN time_outdoors_min END) AS this_v,
          avg(CASE WHEN date <= ? - INTERVAL 28 DAY
                    AND date > ? - INTERVAL 56 DAY THEN time_outdoors_min END) AS prior_v,
          count(CASE WHEN date > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM daily_features
        WHERE user_id = ? AND date > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_v, prior_v, n_this = row
    # Hidden gate: thin window (< ~8 active days) → no honest average. Mirrors _rhythm.
    if this_v is None or n_this is None or int(n_this) < 8:
        return None
    if prior_v and prior_v > 0:
        pct = (float(this_v) - float(prior_v)) / float(prior_v) * 100.0
        # <10% month-to-month is everyday noise → "etwa gleich" (matches _monthly_deltas).
        direction: Literal["up", "down", "flat"] = (
            "flat" if abs(pct) < 10 else ("up" if pct > 0 else "down")
        )
    else:
        pct, direction = 0.0, "flat"
    tail = {
        "flat": "Ähnlich wie im Vormonat.",
        "up": "Etwas mehr als im Vormonat.",
        "down": "Etwas weniger als im Vormonat.",
    }[direction]
    sentence = f"Im Schnitt etwa {_fmt_minutes(this_v)} pro Tag draußen. {tail}"
    return TimeOutdoors(
        avg_min_per_day=float(this_v),
        prior_avg_min=float(prior_v or 0.0),
        pct_delta=float(pct),
        direction=direction,
        sentence=sentence,
    )


def _walking_speed(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> WalkingSpeed | None:
    # Moving speed = distance / (duration - dwell): walk_features.mean_speed divides
    # by the full duration including the 10-40 min destination dwell, which would
    # measure dwell randomness, not gait. Subtracting dwell_s (all sub-0.3 m/s time)
    # recovers transit speed from existing columns. Shown as an observation, not a verdict.
    weekly_rows = con.execute(
        """
        SELECT CAST(date_trunc('week', w.start_ts) AS DATE) AS wk,
               sum(wf.distance_m) / nullif(sum(wf.duration_s - wf.dwell_s), 0) AS mps
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 84 DAY
        GROUP BY 1 ORDER BY 1
        """,
        (user_id, ref_date),
    ).fetchall()
    weekly = [
        SpeedPoint(week_start=wk, kmh=round(float(mps) * 3.6, 2))
        for wk, mps in weekly_rows
        if mps is not None and mps > 0
    ]
    row = con.execute(
        """
        SELECT
          sum(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN wf.distance_m END)
            / nullif(sum(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                              THEN wf.duration_s - wf.dwell_s END), 0) AS this_mps,
          sum(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY THEN wf.distance_m END)
            / nullif(sum(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                              THEN wf.duration_s - wf.dwell_s END), 0) AS prior_mps,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_mps, prior_mps, n_this = row
    # Hidden gate: < 10 walks in the window -> no honest average (mirrors _routine).
    if this_mps is None or n_this is None or int(n_this) < 10:
        return None
    this_kmh = float(this_mps) * 3.6
    prior_kmh = float(prior_mps) * 3.6 if prior_mps else 0.0
    if prior_kmh > 0:
        pct = (this_kmh - prior_kmh) / prior_kmh * 100.0
        direction: Literal["up", "down", "flat"] = (
            "flat" if abs(pct) < 10 else ("up" if pct > 0 else "down")
        )
    else:
        pct, direction = 0.0, "flat"
    tail = {
        "flat": "Ähnlich wie im Vormonat.",
        "up": "Etwas flotter als im Vormonat.",
        "down": "Etwas langsamer als im Vormonat.",
    }[direction]
    sentence = f"Zuletzt im Schnitt etwa {_de_num(this_kmh)} km/h unterwegs. {tail}"
    return WalkingSpeed(
        weekly=weekly,
        this_kmh=round(this_kmh, 2),
        prior_kmh=round(prior_kmh, 2),
        pct_delta=float(pct),
        direction=direction,
        sentence=sentence,
    )


def _pause_stats(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> PauseStats | None:
    # GREATEST(pause_count - 4, 0): stage-2 routed paths register ~4 baseline stops —
    # one destination dwell, typically two spur-turnaround blips, plus one doorstep
    # transition — for every outing. Subtracting 4 isolates genuine mid-walk pauses.
    # Dwell minutes are NOT shown (dwell_s is dominated by the destination dwell and
    # cannot be separated read-side).
    row = con.execute(
        """
        SELECT
          avg(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                   THEN GREATEST(wf.pause_count - 4, 0) END) AS this_p,
          avg(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                   THEN GREATEST(wf.pause_count - 4, 0) END) AS prior_p,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_p, prior_p, n_this = row
    if this_p is None or n_this is None or int(n_this) < 10:
        return None
    this_v = float(this_p)
    prior_v = float(prior_p or 0.0)
    # Absolute gate: prior averages sit near zero, percent deltas would be unstable.
    # Threshold 0.65 gives clear separation between margarete's +0.69 ("up") and otto's
    # +0.11 ("flat") on the demo fixture.
    diff = this_v - prior_v
    direction: Literal["up", "down", "flat"] = (
        "flat" if abs(diff) < 0.65 else ("up" if diff > 0 else "down")
    )
    if this_v < 0.5 and direction == "flat":
        sentence = "Geht meist ohne Zwischenstopp durch."
    elif direction == "up":
        sentence = (
            "Macht unterwegs öfter kurz Halt als im Vormonat. "
            "Eine kleine Pause gehört dazu."
        )
    elif direction == "down":
        sentence = "Macht unterwegs seltener Halt als im Vormonat."
    else:
        sentence = "Macht ab und zu kurz Halt unterwegs. Ähnlich wie im Vormonat."
    return PauseStats(
        avg_pauses_per_walk=round(this_v, 1),
        prior_avg=round(prior_v, 1),
        direction=direction,
        sentence=sentence,
    )


def _walk_fade(
    con: duckdb.DuckDBPyConnection, user_id: str, ref_date: dt.date
) -> WalkFade | None:
    # Within-walk tempo profile. Negative = slower towards the end of a walk.
    # Worded as a tempo observation.
    row = con.execute(
        """
        SELECT
          avg(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY
                   THEN wf.speed_third_delta_pct END) AS this_d,
          avg(CASE WHEN CAST(w.start_ts AS DATE) <= ? - INTERVAL 28 DAY
                   THEN wf.speed_third_delta_pct END) AS prior_d,
          count(CASE WHEN CAST(w.start_ts AS DATE) > ? - INTERVAL 28 DAY THEN 1 END) AS n_this
        FROM walks w JOIN walk_features wf ON wf.walk_id = w.walk_id
        WHERE w.user_id = ? AND CAST(w.start_ts AS DATE) > ? - INTERVAL 56 DAY
        """,
        (ref_date, ref_date, ref_date, user_id, ref_date),
    ).fetchone()
    if row is None:
        return None
    this_d, prior_d, n_this = row
    if this_d is None or n_this is None or int(n_this) < 10:
        return None
    this_v = float(this_d)
    direction: Literal["up", "down", "flat"] = "down" if this_v <= -8.0 else "flat"
    if direction == "down":
        sentence = (
            "Gegen Ende eines Spaziergangs wird das Tempo ruhiger. "
            f"Das letzte Drittel ist etwa {abs(round(this_v))} % langsamer."
        )
    else:
        sentence = "Das Tempo bleibt über den Spaziergang hinweg ähnlich."
    return WalkFade(
        this_delta_pct=round(this_v, 1),
        prior_delta_pct=round(float(prior_d or 0.0), 1),
        direction=direction,
        sentence=sentence,
    )


def patterns_screen(db_path: Path, user_id: str) -> PatternsScreen:
    con = _con(db_path)
    try:
        ref = con.execute(
            "SELECT max(date) FROM daily_features WHERE user_id = ?", (user_id,)
        ).fetchone()
        ref_date = ref[0] if ref and ref[0] else dt.date.today()
        return PatternsScreen(
            user_id=user_id,
            highlights=_highlights(con, user_id, ref_date),
            rhythm=_rhythm(con, user_id, ref_date),
            monthly_deltas=_monthly_deltas(con, user_id, ref_date),
            routine=_routine(con, user_id, ref_date),
            time_outdoors=_time_outdoors(con, user_id, ref_date),
            walking_speed=_walking_speed(con, user_id, ref_date),
            pauses=_pause_stats(con, user_id, ref_date),
            walk_fade=_walk_fade(con, user_id, ref_date),
        )
    finally:
        con.close()


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
        pron = _pronoun(user_id)
        chart_data: list[tuple[str, str, Literal["line", "bar", "places", "list"]]] = [
            ("total_distance_m", f"Wie weit geht {name}?", "bar"),
            ("activity_radius_m", "Bleibt der Aktionsradius gleich?", "line"),
            ("n_outings", f"Geht {pron} regelmäßig raus?", "bar"),
            ("place_count", f"Wo war {pron} unterwegs?", "places"),
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
        n_cp = len(cp_rows)
        cp_verdict = (
            "Keine nennenswerten Veränderungen."
            if not cp_rows
            else (
                "Eine Veränderung zuletzt erkannt."
                if n_cp == 1
                else f"{n_cp} Veränderungen zuletzt erkannt."
            )
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
    verb = "sind" if feature == "n_outings" else "ist"
    if abs(delta) < 7:
        return f"{name} {verb} stabil."
    direction = "niedriger" if delta < 0 else "höher"
    return f"{name} {verb} {abs(delta):.0f}% {direction} als der Mittelwert."
