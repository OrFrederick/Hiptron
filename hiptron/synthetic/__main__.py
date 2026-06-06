"""CLI: python -m hiptron.synthetic seed --scenario combined [--db data/hiptron.duckdb]"""

from __future__ import annotations

import argparse
from pathlib import Path

from hiptron.db.connection import apply_schema, open_db
from hiptron.synthetic.generator import generate
from hiptron.synthetic.scenarios import SCENARIOS


def seed(db_path: Path | str, scenario_name: str, *, replace: bool) -> None:
    if scenario_name not in SCENARIOS:
        raise SystemExit(f"unknown scenario: {scenario_name} (known: {list(SCENARIOS)})")
    scenario = SCENARIOS[scenario_name]
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    try:
        if replace:
            con.execute("DELETE FROM gps_fixes WHERE user_id = ?", (scenario.user_id,))
        print(f"[seed] scenario={scenario_name} user={scenario.user_id} weeks={scenario.weeks}")
        generate(scenario, con)
        n = con.execute(
            "SELECT count(*) FROM gps_fixes WHERE user_id = ?", (scenario.user_id,)
        ).fetchone()[0]
        print(f"[seed] gps_fixes for {scenario.user_id}: {n}")
    finally:
        con.close()


def main() -> None:
    parser = argparse.ArgumentParser(prog="hiptron.synthetic")
    sub = parser.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("seed")
    s.add_argument("--db", default="data/hiptron.duckdb")
    s.add_argument("--scenario", default="combined", choices=list(SCENARIOS))
    s.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing gps_fixes for this user before seeding",
    )
    args = parser.parse_args()
    if args.cmd == "seed":
        seed(args.db, args.scenario, replace=args.replace)


if __name__ == "__main__":
    main()
