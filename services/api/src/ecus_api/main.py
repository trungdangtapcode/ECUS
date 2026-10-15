import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from uuid import uuid4

import httpx
from fastapi import FastAPI, Request, Response

from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.config import Settings
from ecus_api.core.errors import ErrorResponse, error_response, install_error_handlers
from ecus_api.core.health import router as health_router
from ecus_api.db.session import Database
from ecus_api.jobs.router import router as jobs_router
from ecus_api.jobs.runner import JobRunner
from ecus_api.modules.cases.router import router as cases_router
from ecus_api.modules.reference.router import router as reference_router
from ecus_api.modules.review import extraction, processing
from ecus_api.modules.review.router import router as review_router

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    database = Database(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        runner = JobRunner(
            database.sessions,
            concurrency=settings.jobs_concurrency,
            max_pending=settings.jobs_max_pending,
            timeout=settings.jobs_timeout_seconds,
        )
        try:
            async with httpx.AsyncClient(follow_redirects=False) as client:
                app.state.ai = OpenAICompatible(settings, client)
                app.state.jobs = runner
                runner.register(
                    extraction.JOB_KIND,
                    extraction.handler(database.sessions, app.state.ai, settings),
                    include_job_id=True,
                )
                runner.register(
                    processing.JOB_KIND,
                    processing.handler(database.sessions, app.state.ai, settings),
                    timeout=settings.processing_timeout_seconds,
                    include_job_id=True,
                )
                await runner.recover_interrupted()
                try:
                    yield
                finally:
                    await runner.close()
        finally:
            await database.close()

    app = FastAPI(
        title="Customs Pre-Declaration API",
        version="0.1.0",
        description="Local development scaffold. Authentication is not implemented yet.",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
        responses={code: {"model": ErrorResponse} for code in (400, 404, 409, 422, 503)},
    )
    app.state.settings = settings
    app.state.database = database
    install_error_handlers(app)

    @app.middleware("http")
    async def request_context(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.request_id = str(uuid4())
        try:
            response = await call_next(request)
        except Exception:
            logger.error("Unhandled request failure; request_id=%s", request.state.request_id)
            response = error_response(
                request, "internal_error", "An unexpected error occurred.", 500
            )
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    for router in (health_router, cases_router, reference_router, jobs_router, review_router):
        app.include_router(router, prefix="/api/v1")
    return app
