from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.run import run_pipeline
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import BASELINE_SCENARIO


@pytest.fixture(scope="module")
def populated_db(tmp_path_factory) -> Path:
    db_path = tmp_path_factory.mktemp("api") / "api.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    generate(BASELINE_SCENARIO, con)
    con.close()
    run_pipeline(db_path, stage="all")
    return db_path


def test_older_adult_home_returns_cards(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/older-adult/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "greeting" in body
    assert "yesterday_walk" in body
    assert "schematic_map" in body
    assert "streak_days" in body
    # Senior week view feeds off week_distances (mirrors relative weekly_trend)
    assert body["week_distances"] is not None
    assert isinstance(body["week_distances"]["points"], list)
    # Status reflects changepoint detection (calm but honest)
    assert body["status"] in {"green", "amber"}


def test_older_adult_home_places_carry_visit_counts(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/older-adult/home", params={"user_id": "helga"})
    places = (r.json().get("schematic_map") or {}).get("places", [])
    assert places, "expected at least one schematic place"
    assert all("visits" in p for p in places)
    assert any(p["visits"] > 0 for p in places)


def test_relative_home_returns_status(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/home", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in {"green", "amber"}
    assert "weekly_trend" in body


def test_relative_insights_detail(populated_db: Path):
    client = TestClient(create_app(populated_db))
    r = client.get("/api/relative/insights", params={"user_id": "helga"})
    assert r.status_code == 200
    body = r.json()
    assert "blocks" in body
    assert isinstance(body["blocks"], list)
    place_block = next(
        (b for b in body["blocks"] if b.get("feature") == "place_count"), None
    )
    assert place_block is not None
    # Places block carries per-place frequency rows (label + count), not a daily series
    for row in place_block["series"]:
        assert "label" in row and "count" in row


def _hav_m(a, b):
    import math

    r = 6_371_000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = math.radians(b[0] - a[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def test_schematic_walk_polyline_connects_to_home(populated_db: Path):
    # The walk segmenter trims fixes inside HOME_RADIUS_M, so a naive
    # start_ts..end_ts fix query leaves the drawn route floating ~50-70 m
    # from the home pin. The map polyline must reach back to the doorstep.
    client = TestClient(create_app(populated_db))
    for url in ("/api/older-adult/home", "/api/relative/home"):
        r = client.get(url, params={"user_id": "helga"})
        assert r.status_code == 200
        smap = r.json().get("schematic_map")
        assert smap, f"{url}: expected schematic_map"
        line = smap["walk_polyline"]
        assert len(line) > 1
        home = (smap["home_lat"], smap["home_lon"])
        assert _hav_m(line[0], home) < 25.0, f"{url}: polyline start detached from home"
        assert _hav_m(line[-1], home) < 25.0, f"{url}: polyline end detached from home"

        # Multi-walk layer: a week of walks, each a loop that starts AND ends home.
        lines = smap["walk_polylines"]
        assert len(lines) >= 1, f"{url}: expected recent walk polylines"
        assert lines[0] == line, f"{url}: walk_polyline must be the newest of the layer"
        for ln in lines:
            assert len(ln) > 1
            assert _hav_m(ln[0], home) < 25.0, f"{url}: a walk starts detached from home"
            assert _hav_m(ln[-1], home) < 25.0, f"{url}: a walk ends detached from home"
