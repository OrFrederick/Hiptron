default:
    @just --list

install:
    uv sync --extra dev
    cd webapp && pnpm install

pipeline *args:
    uv run python -m hiptron.pipeline run {{args}}

backend:
    uv run uvicorn hiptron.backend.main:app --reload --port 8000

dev:
    cd webapp && pnpm dev

test:
    uv run pytest
    cd webapp && pnpm test

lint:
    uv run ruff check .
    uv run mypy hiptron
    cd webapp && pnpm lint

format:
    uv run ruff format .
    cd webapp && pnpm format

clean:
    rm -f data/hiptron.duckdb data/hiptron.duckdb.wal
