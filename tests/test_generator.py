# tests/test_generator.py
from hiptron.synthetic.generator import _outings_for_week, _places_for_week
from hiptron.synthetic.scenarios import DEFAULT_PLACES, Scenario


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
