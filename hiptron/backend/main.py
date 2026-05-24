from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hiptron.backend.models import (
    InsightsDetail, OlderAdultHome, RelativeHome,
)
from hiptron.backend.queries import (
    insights_detail, older_adult_home, relative_home,
)


def create_app(db_path: Path | str) -> FastAPI:
    app = FastAPI(title="Hiptron Mobility Insights")
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"],
        allow_methods=["GET"], allow_headers=["*"],
    )
    db = Path(db_path)

    @app.get("/api/older-adult/home", response_model=OlderAdultHome)
    def get_older_adult_home(user_id: str) -> OlderAdultHome:
        return older_adult_home(db, user_id)

    @app.get("/api/relative/home", response_model=RelativeHome)
    def get_relative_home(user_id: str) -> RelativeHome:
        return relative_home(db, user_id)

    @app.get("/api/relative/insights", response_model=InsightsDetail)
    def get_relative_insights(user_id: str) -> InsightsDetail:
        return insights_detail(db, user_id)

    return app


app = create_app(Path("data/hiptron.duckdb"))
