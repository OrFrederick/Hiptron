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
    outings_decline_start_week: int | None = None
    places: tuple["NamedPlace", ...] | None = None
    place_shrink_start_week: int | None = None
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

# Otto's repertoire: five everyday spots, each reachable any weekday with high
# visit probability, so a full week normally touches ~3-4 distinct places.
# When the repertoire collapses (place_shrink_start_week) the daily distinct-place
# count drops sharply, giving a clean, recent place_count change-point.
# Five everyday spots reachable any weekday, each at a distinct hour, all visited
# (prob 1.0) so a normal week touches ~3-4 distinct places. When the repertoire
# collapses (place_shrink_start_week) otto's world contracts to one or two spots:
# a recent place_count change-point, plus the natural knock-on of fewer/merged
# outings and less distance — a coherent "withdrawing" picture for the caregiver.
OTTO_PLACES = (
    NamedPlace("bakery", 80.0, 60.0, 1.0, (0, 1, 2, 3, 4, 5, 6), 9),
    NamedPlace("park", -50.0, 150.0, 1.0, (0, 1, 2, 3, 4, 5, 6), 11),
    NamedPlace("shop", 40.0, -90.0, 1.0, (0, 1, 2, 3, 4, 5, 6), 14),
    NamedPlace("friend", -180.0, -120.0, 1.0, (0, 1, 2, 3, 4, 5, 6), 16),
    NamedPlace("doctor", 200.0, -80.0, 1.0, (0, 1, 2, 3, 4, 5, 6), 10),
)

# Pinned "now" so the demo data is fully reproducible (the generator is otherwise
# anchored to datetime.now(), which makes change-point timing drift between reseeds).
DEMO_END = datetime(2026, 6, 6)


BASELINE_SCENARIO = Scenario(
    user_id="helga",
    seed=42,
    weeks=8,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
)


HELGA_SCENARIO = Scenario(
    user_id="helga",
    seed=7,
    weeks=12,
    home_lat=52.5200,
    home_lon=13.4050,
    outings_per_day=2,
    mean_outing_distance_m=1200.0,
    distance_decline_pct_per_week=18.0,
    decline_start_week=6,
    end_dt=DEMO_END,
)

# Otto's "smaller world": full repertoire until late, then a sharp recent collapse
# to one or two spots -> a recent place_count change-point (his caregiver alert).
OTTO_SCENARIO = Scenario(
    user_id="otto",
    seed=55,
    weeks=12,
    home_lat=50.7753,
    home_lon=6.0839,
    outings_per_day=4,
    mean_outing_distance_m=1100.0,
    places=OTTO_PLACES,
    place_repertoire_shrink=True,
    place_shrink_start_week=10,
    end_dt=DEMO_END,
)

MARGARETE_SCENARIO = Scenario(
    user_id="margarete",
    seed=33,
    weeks=12,
    home_lat=48.1351,
    home_lon=11.5820,
    outings_per_day=3,
    mean_outing_distance_m=1000.0,
    outings_decline_start_week=6,
    end_dt=DEMO_END,
)

# Healthy control: no decline knobs. Seed chosen so the pinned-date data yields
# zero change-points, keeping ingrid the demo's reliable "all-clear" persona.
INGRID_SCENARIO = Scenario(
    user_id="ingrid",
    seed=63,
    weeks=12,
    home_lat=53.5511,
    home_lon=9.9937,
    outings_per_day=2,
    mean_outing_distance_m=1300.0,
    end_dt=DEMO_END,
)


SCENARIOS = {
    "helga": HELGA_SCENARIO,
    "otto": OTTO_SCENARIO,
    "margarete": MARGARETE_SCENARIO,
    "ingrid": INGRID_SCENARIO,
}
