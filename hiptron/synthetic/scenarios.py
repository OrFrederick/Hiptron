from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class NamedPlace:
    label: str
    lat_offset_m: float
    lon_offset_m: float
    visit_prob: float
    typical_dow: tuple[int, ...]
    typical_hour: int


@dataclass(frozen=True)
class Scenario:
    user_id: str
    seed: int
    weeks: int
    home_lat: float
    home_lon: float
    outings_per_day: int
    mean_outing_distance_m: float
    distance_decline_pct_per_week: float = 0.0
    decline_start_week: int | None = None
    fatigue_onset_week: int | None = None
    place_repertoire_shrink: bool = False
    end_dt: datetime | None = None

    def end(self) -> datetime:
        return self.end_dt or datetime.now()

    def start(self) -> datetime:
        return self.end() - timedelta(weeks=self.weeks)


DEFAULT_PLACES = (
    NamedPlace("bakery", 80.0, 60.0, 0.6, (0, 1, 2, 3, 4, 5), 9),
    NamedPlace("park", -50.0, 150.0, 0.5, (0, 1, 2, 3, 4, 5, 6), 14),
    NamedPlace("doctor", 200.0, -80.0, 0.08, (1, 3), 11),
    NamedPlace("friend", -180.0, -120.0, 0.2, (5, 6), 15),
    NamedPlace("shop", 40.0, -90.0, 0.4, (1, 3, 5), 10),
)


BASELINE_SCENARIO = Scenario(
    user_id="helga",
    seed=42,
    weeks=8,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
)


DECLINE_SCENARIO = Scenario(
    user_id="helga",
    seed=7,
    weeks=10,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    distance_decline_pct_per_week=20.0,
    decline_start_week=4,
)


FATIGUE_SCENARIO = Scenario(
    user_id="helga",
    seed=3,
    weeks=10,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    fatigue_onset_week=5,
)


SHRINK_SCENARIO = Scenario(
    user_id="helga",
    seed=21,
    weeks=10,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    place_repertoire_shrink=True,
)


COMBINED_SCENARIO = Scenario(
    user_id="helga",
    seed=7,
    weeks=10,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    distance_decline_pct_per_week=20.0,
    decline_start_week=4,
)


SCENARIOS = {
    "baseline": BASELINE_SCENARIO,
    "decline": DECLINE_SCENARIO,
    "fatigue": FATIGUE_SCENARIO,
    "shrink": SHRINK_SCENARIO,
    "combined": COMBINED_SCENARIO,
}
