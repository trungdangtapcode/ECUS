"""Bounded, single-process jobs. Interrupted work requires an explicit retry.

This is not a durable queue. Handlers own domain transactions and must check
input versions before applying results. Store IDs in payloads, not document bodies.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ecus_api.core.errors import AppError
from ecus_api.db.base import utcnow
from ecus_api.jobs.models import ProcessingJob

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
logger = logging.getLogger(__name__)


class JobRunner:
    def __init__(
        self,
        sessions: async_sessionmaker[AsyncSession],
        *,
        concurrency: int,
        max_pending: int,
        timeout: float,
    ) -> None:
        self._sessions = sessions
        self._semaphore = asyncio.Semaphore(concurrency)
        self._capacity = concurrency + max_pending
        self._timeout = timeout
        self._handlers: dict[str, Handler] = {}
        self._timeouts: dict[str, float] = {}
        self._contextual: set[str] = set()
        self._tasks: dict[UUID, asyncio.Task[None]] = {}
        self._lock = asyncio.Lock()
        self._closing = False

    def register(
        self,
        kind: str,
        handler: Handler,
        *,
        timeout: float | None = None,
        include_job_id: bool = False,
    ) -> None:
        if kind in self._handlers:
            raise ValueError(f"Handler already registered: {kind}")
        self._handlers[kind] = handler
        self._timeouts[kind] = timeout or self._timeout
        if include_job_id:
            self._contextual.add(kind)

    async def recover_interrupted(self) -> None:
        # Only safe with one process/replica. Never auto-replay paid AI calls.
        async with self._sessions() as session:
            await session.execute(
                update(ProcessingJob)
                .where(ProcessingJob.status.in_(["pending", "running"]))
                .values(status="interrupted", error_code="process_restarted", updated_at=utcnow())
            )
            await session.commit()

    async def submit(
        self,
        kind: str,
        payload: dict[str, Any],
        *,
        deduplicate: bool = False,
        deduplicate_by: tuple[str, ...] | None = None,
    ) -> UUID:
        async with self._lock:
            if kind not in self._handlers:
                raise AppError("unknown_job", "This job type is not supported.")
            if deduplicate or deduplicate_by:
                async with self._sessions() as session:
                    active = await session.scalars(
                        select(ProcessingJob).where(
                            ProcessingJob.kind == kind,
                            ProcessingJob.status.in_(["pending", "running"]),
                        )
                    )
                    for existing in active:
                        matches = (
                            all(
                                existing.payload.get(key) == payload.get(key)
                                for key in deduplicate_by
                            )
                            if deduplicate_by
                            else existing.payload == payload
                        )
                        if matches:
                            return existing.id
            if self._closing or len(self._tasks) >= self._capacity:
                raise AppError("jobs_busy", "Processing capacity is full. Please retry later.", 503)
            async with self._sessions() as session:
                job = ProcessingJob(kind=kind, payload=payload)
                session.add(job)
                await session.commit()
                job_id = job.id
            task = asyncio.create_task(self._run(job_id, kind, payload), name=f"job:{job_id}")
            self._tasks[job_id] = task
            task.add_done_callback(lambda completed: self._finished(job_id, completed))
            return job_id

    def _finished(self, job_id: UUID, task: asyncio.Task[None]) -> None:
        self._tasks.pop(job_id, None)
        if not task.cancelled() and task.exception() is not None:
            # Do not log exception bodies that could include documents or API secrets.
            logger.error("Job persistence failed; job_id=%s", job_id)

    async def _save(
        self,
        job_id: UUID,
        status: str,
        *,
        result: dict[str, Any] | None = None,
        error_code: str | None = None,
    ) -> None:
        values: dict[str, Any] = {
            "status": status,
            "error_code": error_code,
            "updated_at": utcnow(),
        }
        # Failed/interrupted handlers may already have saved progress diagnostics.
        if result is not None or status in {"running", "succeeded"}:
            values["result"] = result
        async with self._sessions() as session:
            await session.execute(
                update(ProcessingJob).where(ProcessingJob.id == job_id).values(**values)
            )
            await session.commit()

    async def _run(self, job_id: UUID, kind: str, payload: dict[str, Any]) -> None:
        try:
            async with self._semaphore:
                await self._save(job_id, "running")
                context = (
                    {**payload, "_job_id": str(job_id)} if kind in self._contextual else payload
                )
                async with asyncio.timeout(self._timeouts[kind]):
                    result = await self._handlers[kind](context)
                await self._save(job_id, "succeeded", result=result)
        except asyncio.CancelledError:
            await self._save(job_id, "interrupted", error_code="process_stopped")
            raise
        except TimeoutError:
            await self._save(job_id, "failed", error_code="job_timeout")
        except AppError as exc:
            await self._save(job_id, "failed", error_code=exc.code)
        except Exception:
            await self._save(job_id, "failed", error_code="job_failed")

    async def close(self) -> None:
        async with self._lock:
            self._closing = True
            tasks = list(self._tasks.values())
            ids = list(self._tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        # Covers cancellation before a coroutine had a chance to start.
        if ids:
            async with self._sessions() as session:
                await session.execute(
                    update(ProcessingJob)
                    .where(
                        ProcessingJob.id.in_(ids),
                        ProcessingJob.status.in_(["pending", "running"]),
                    )
                    .values(status="interrupted", error_code="process_stopped", updated_at=utcnow())
                )
                await session.commit()
