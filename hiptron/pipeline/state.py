import datetime as dt

import duckdb


def get_watermark(con: duckdb.DuckDBPyConnection, stage: str) -> dt.datetime | None:
    row = con.execute(
        "SELECT last_processed_ts FROM pipeline_state WHERE stage = ?", (stage,)
    ).fetchone()
    return row[0] if row else None


def set_watermark(con: duckdb.DuckDBPyConnection, stage: str, ts: dt.datetime) -> None:
    con.execute(
        """
        INSERT INTO pipeline_state VALUES (?, ?)
        ON CONFLICT(stage) DO UPDATE SET last_processed_ts = EXCLUDED.last_processed_ts
        """,
        (stage, ts),
    )
