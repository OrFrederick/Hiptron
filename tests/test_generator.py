# tests/test_generator.py
from hiptron.synthetic.generator import _outings_for_week, _places_for_week
from hiptron.synthetic.scenarios import DEFAULT_PLACES, SCENARIOS, Scenario


def _scn(**kw) -> Scenario:
    base = dict(
        user_id="t",
        seed=1,
        weeks=12,
        home_lat=52.52,
        home_lon=13.40,
        outings_per_day=3,
        mean_outing_distance_m=1200.0,
    )
    base.update(kw)
    return Scenario(**base)


def test_outings_taper_reduces_over_weeks():
    s = _scn(outings_decline_start_week=5)
    assert _outings_for_week(s, 0) == 3  # before taper
    assert _outings_for_week(s, 5) < 3  # tapering
    assert _outings_for_week(s, 11) <= _outings_for_week(s, 6)
    assert _outings_for_week(s, 11) >= 1  # never zero


def test_no_taper_when_unset():
    s = _scn()
    assert _outings_for_week(s, 0) == 3
    assert _outings_for_week(s, 11) == 3


def test_places_override_subset():
    subset = DEFAULT_PLACES[:2]
    s = _scn(places=subset)
    assert _places_for_week(s, 0, None) == subset


def test_place_shrink_start_week_is_late_and_sharp():
    s = _scn(place_repertoire_shrink=True, place_shrink_start_week=10)
    # Full repertoire before the start week...
    assert _places_for_week(s, 0, None) == DEFAULT_PLACES
    assert _places_for_week(s, 9, None) == DEFAULT_PLACES
    # ...then a sharp collapse that bottoms out near the end.
    assert len(_places_for_week(s, 10, None)) < len(DEFAULT_PLACES)
    assert len(_places_for_week(s, 12, None)) == 1


def test_personas_have_distinct_user_ids():
    assert set(SCENARIOS) == {"helga", "otto", "margarete", "ingrid"}
    uids = {name: scn.user_id for name, scn in SCENARIOS.items()}
    assert uids == {
        "helga": "helga",
        "otto": "otto",
        "margarete": "margarete",
        "ingrid": "ingrid",
    }
    # ingrid is the healthy control: no decline knobs.
    ing = SCENARIOS["ingrid"]
    assert ing.distance_decline_pct_per_week == 0.0
    assert ing.outings_decline_start_week is None
    assert ing.place_repertoire_shrink is False
