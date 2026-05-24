import duckdb
import pytest

from hiptron.db.connection import apply_schema, open_db


def test_schema_applies_and_tables_exist(tmp_path):
    db_path = tmp_path / "test.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    tables = {row[0] for row in con.execute("SHOW TABLES").fetchall()}
    expected = {
        "gps_fixes",
        "walks",
        "walk_features",
        "places",
        "walk_place_visits",
        "daily_features",
        "baselines",
        "changepoints",
        "insights",
        "pipeline_state",
    }
    assert expected.issubset(tables)
    con.close()


def test_open_db_read_only_blocks_writes(tmp_path):
    db_path = tmp_path / "test.duckdb"
    con = open_db(db_path, read_only=False)
    apply_schema(con)
    con.close()

    ro = open_db(db_path, read_only=True)
    with pytest.raises(duckdb.Error):
        ro.execute("INSERT INTO gps_fixes VALUES ('u1', NOW(), 0.0, 0.0, 5.0)")
    ro.close()
