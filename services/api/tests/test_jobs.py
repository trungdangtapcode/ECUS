import asyncio
from typing import Any
from uuid import UUID

import pytest

from ecus_api.core.errors import AppError
from ecus_api.db.session import Database
from ecus_api.jobs.models import ProcessingJob
from ecus_api.jobs.runner import JobRunner


async def wait_for_status(database: Database, job_id: UUID, status: str) -> ProcessingJob:
    async with asyncio.timeout(3):
        while True:
            async with database.sessions() as session:
                job = await session.get(ProcessingJob, job_id)
                if job is not None and job.status == status:
                    return job
            await asyncio.sleep(0.01)


async def test_bounded_runner_persists_results(database: Database) -> None:
    runner = JobRunner(database.sessions, concurrency=1, max_pending=0, timeout=2)
    release = asyncio.Event()

    async def handler(payload: dict[str, Any]) -> dict[str, Any]:
        await release.wait()
        return {"source_id": payload["source_id"]}

    runner.register("fixture", handler)
    try:
        job_id = await runner.submit("fixture", {"source_id": "source-1"})
        with pytest.raises(AppError) as error:
            await runner.submit("fixture", {})
        assert error.value.code == "jobs_busy"
        release.set()
        job = await wait_for_status(database, job_id, "succeeded")
        assert job.result == {"source_id": "source-1"}
    finally:
        await runner.close()


async def test_shutdown_and_restart_do_not_silently_resume_jobs(database: Database) -> None:
    runner = JobRunner(database.sessions, concurrency=1, max_pending=1, timeout=10)

    async def handler(payload: dict[str, Any]) -> dict[str, Any]:
        await asyncio.Event().wait()
        return {}

    runner.register("fixture", handler)
    first = await runner.submit("fixture", {})
    second = await runner.submit("fixture", {})
    await runner.close()
    await wait_for_status(database, first, "interrupted")
    await wait_for_status(database, second, "interrupted")
    async with database.sessions() as session:
        orphan = ProcessingJob(kind="fixture", payload={}, status="running")
        session.add(orphan)
        await session.commit()
        orphan_id = orphan.id
    fresh = JobRunner(database.sessions, concurrency=1, max_pending=0, timeout=1)
    await fresh.recover_interrupted()
    assert (
        await wait_for_status(database, orphan_id, "interrupted")
    ).error_code == "process_restarted"
    await fresh.close()


async def test_job_timeout_is_visible(database: Database) -> None:
    runner = JobRunner(database.sessions, concurrency=1, max_pending=0, timeout=0.02)

    async def slow(payload: dict[str, Any]) -> dict[str, Any]:
        await asyncio.Event().wait()
        return {}

    runner.register("fixture", slow)
    try:
        job_id = await runner.submit("fixture", {})
        assert (await wait_for_status(database, job_id, "failed")).error_code == "job_timeout"
    finally:
        await runner.close()
