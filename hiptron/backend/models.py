from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import BaseModel


class Place(BaseModel):
    place_id: str
    label: str
    centroid_lat: float
    centroid_lon: float
    visits: int = 0


class WalkSummary(BaseModel):
    walk_id: str
    start_ts: dt.datetime
    end_ts: dt.datetime
    distance_m: float
    place_labels: list[str]


class SchematicMap(BaseModel):
    home_lat: float
    home_lon: float
    places: list[Place]
    walk_polyline: list[tuple[float, float]]


class WeeklyTrendPoint(BaseModel):
    date: dt.date
    value: float


class WeeklyTrend(BaseModel):
    headline: str
    points: list[WeeklyTrendPoint]
    baseline_mean: float


class OlderAdultHome(BaseModel):
    greeting: str
    date: dt.date
    yesterday_walk: WalkSummary | None
    schematic_map: SchematicMap | None
    streak_days: int
    family_note: str | None
    trend_card: str | None
    week_distances: WeeklyTrend | None = None


class WorthNoticing(BaseModel):
    headline: str
    detail: str
    feature: str


class RelativeHome(BaseModel):
    status: Literal["green", "amber"]
    last_update: dt.datetime
    summary: str
    weekly_trend: WeeklyTrend
    worth_noticing: WorthNoticing | None
    schematic_map: SchematicMap | None = None
    recent_outings: list[WalkSummary] = []
    home_label: str = "Zuhause"


class InsightBlock(BaseModel):
    question: str
    verdict: str
    chart_kind: Literal["line", "bar", "places", "list"]
    series: list[dict[str, Any]]
    hidden: bool = False
    feature: str | None = None


class InsightsDetail(BaseModel):
    user_id: str
    blocks: list[InsightBlock]
