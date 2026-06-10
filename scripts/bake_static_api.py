"""Bake the demo API responses to static JSON for the GitHub Pages build.

The whole backend is read-only demo data (4 personas x 4 GET endpoints), so a
static snapshot is equivalent to the live API. Output lands in
webapp/public/api/<endpoint>/<user>.json and is fetched by api.ts when the app
is built with VITE_STATIC_API=1.

    .venv/bin/python scripts/bake_static_api.py [--db data/hiptron.duckdb]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from fastapi.testclient import TestClient

from hiptron.backend.main import create_app
from hiptron.synthetic.scenarios import SCENARIOS

ENDPOINTS = [
    "older-adult/home",
    "relative/home",
    "relative/insights",
    "relative/patterns",
]

OUT_ROOT = Path(__file__).parents[1] / "webapp" / "public" / "api"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="data/hiptron.duckdb")
    args = parser.parse_args()

    users = sorted({scn.user_id for scn in SCENARIOS.values()})
    client = TestClient(create_app(Path(args.db)))
    for endpoint in ENDPOINTS:
        out_dir = OUT_ROOT / endpoint
        out_dir.mkdir(parents=True, exist_ok=True)
        for user in users:
            r = client.get(f"/api/{endpoint}", params={"user_id": user})
            r.raise_for_status()
            path = out_dir / f"{user}.json"
            path.write_text(json.dumps(r.json(), separators=(",", ":")))
            print(f"[bake] {path.relative_to(OUT_ROOT.parents[1])} ({path.stat().st_size} B)")


if __name__ == "__main__":
    main()
