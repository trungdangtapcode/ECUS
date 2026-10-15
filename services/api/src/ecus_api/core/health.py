from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from ecus_api.core.errors import AppError
from ecus_api.db.session import Database

router = APIRouter(prefix="/health", tags=["health"])


class HealthRead(BaseModel):
    status: Literal["ok"] = "ok"


@router.get("/live", response_model=HealthRead, operation_id="liveness")
async def live() -> HealthRead:
    return HealthRead()


@router.get("/ready", response_model=HealthRead, operation_id="readiness")
async def ready(request: Request) -> HealthRead:
    database: Database = request.app.state.database
    try:
        async with database.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise AppError("database_unavailable", "The database is unavailable.", 503) from None
    return HealthRead()
