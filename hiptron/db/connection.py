from pathlib import Path

import duckdb


def open_db(path: Path | str, *, read_only: bool) -> duckdb.DuckDBPyConnection:
    """Open a DuckDB connection. Parent dir created if missing."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(p), read_only=read_only)


def apply_schema(con: duckdb.DuckDBPyConnection) -> None:
    """Apply the DDL from schema.sql."""
    schema_path = Path(__file__).parent / "schema.sql"
    con.execute(schema_path.read_text())
