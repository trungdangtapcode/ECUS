from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.core.errors import AppError
from ecus_api.db.session import get_session
from ecus_api.jobs.models import ProcessingJob

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: str
    status: Literal["pending", "running", "succeeded", "failed", "interrupted"]
    error_code: str | None
    created_at: datetime
    updated_at: datetime


@router.get("/{job_id}", response_model=JobRead, operation_id="getJob")
async def get_job(job_id: UUID, session: Annotated[AsyncSession, Depends(get_session)]) -> JobRead:
    job = await session.get(ProcessingJob, job_id)
    if job is None:
        raise AppError("job_not_found", "Job not found.", 404)
    return JobRead.model_validate(job)
