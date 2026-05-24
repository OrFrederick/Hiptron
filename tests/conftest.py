import os
from pathlib import Path

import duckdb
import pytest


@pytest.fixture
def tmp_db(tmp_path: Path) -> duckdb.DuckDBPyConnection:
    """Fresh in-memory-backed DuckDB with full schema applied."""
    db_path = tmp_path / "test.duckdb"
    con = duckdb.connect(str(db_path))
    schema_path = Path(__file__).parent.parent / "hiptron" / "db" / "schema.sql"
    con.execute(schema_path.read_text())
    yield con
    con.close()
