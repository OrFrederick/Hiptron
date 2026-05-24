"""CLI: python -m hiptron.pipeline run --db data/hiptron.duckdb --stage all|<name>"""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from typing import Callable

import duckdb

from hiptron.db.connection import apply_schema, open_db
from hiptron.pipeline.stages._01_segment_walks import segment_walks
from hiptron.pipeline.stages._02_walk_features import compute_walk_features
from hiptron.pipeline.stages._03_cluster_places import cluster_places
from hiptron.pipeline.stages._04_daily_aggregate import aggregate_daily
from hiptron.pipeline.stages._05_baselines import update_baselines
from hiptron.pipeline.stages._06_changepoints import detect_changepoints
from hiptron.pipeline.stages._07_insights import generate_insights
from hiptron.pipeline.state import set_watermark

StageFn = Callable[[duckdb.DuckDBPyConnection], None]

STAGES: dict[str, StageFn] = {
    "segment_walks": segment_walks,
    "walk_features": compute_walk_features,
    "cluster_places": cluster_places,
    "daily_aggregate": aggregate_daily,
    "baselines": update_baselines,
    "changepoints": detect_changepoints,
    "insights": generate_insights,
}


def run_pipeline(db_path: Path | str, stage: str = "all") -> None:
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    try:
        if stage == "all":
            for name, fn in STAGES.items():
                _run_one(con, name, fn)
        elif stage in STAGES:
            _run_one(con, stage, STAGES[stage])
        else:
            raise SystemExit(f"unknown stage: {stage} (known: {list(STAGES)})")
    finally:
        con.close()


def _run_one(con: duckdb.DuckDBPyConnection, name: str, fn: StageFn) -> None:
    print(f"[stage] {name}")
    fn(con)
    set_watermark(con, name, dt.datetime.now())


def main() -> None:
    parser = argparse.ArgumentParser(prog="hiptron.pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)
    run = sub.add_parser("run")
    run.add_argument("--db", default="data/hiptron.duckdb")
    run.add_argument("--stage", default="all")
    args = parser.parse_args()
    if args.cmd == "run":
        run_pipeline(args.db, args.stage)


if __name__ == "__main__":
    main()
