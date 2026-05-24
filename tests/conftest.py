import datetime
from pathlib import Path
from unittest.mock import patch

import duckdb
import pytest

# Pin datetime.now() so that Scenario.end() is deterministic across test runs.
_FROZEN_NOW = datetime.datetime(2026, 5, 24, 12, 0, 0)


class _FrozenDatetime(datetime.datetime):
    @classmethod
    def now(cls, tz=None):
        return _FROZEN_NOW if tz is None else _FROZEN_NOW.replace(tzinfo=tz)


@pytest.fixture(autouse=True, scope="session")
def freeze_datetime_now():
    """Replace datetime.now() in scenarios module with a fixed value for reproducibility."""
    with patch("hiptron.synthetic.scenarios.datetime", _FrozenDatetime):
        yield


@pytest.fixture
def tmp_db(tmp_path: Path) -> duckdb.DuckDBPyConnection:
    """Fresh in-memory-backed DuckDB with full schema applied."""
    db_path = tmp_path / "test.duckdb"
    con = duckdb.connect(str(db_path))
    schema_path = Path(__file__).parent.parent / "hiptron" / "db" / "schema.sql"
    con.execute(schema_path.read_text())
    yield con
    con.close()
