from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from asgi_lifespan import LifespanManager
from pydantic import SecretStr

from ecus_api.core.config import Settings
from ecus_api.db import models  # noqa: F401
from ecus_api.db.base import Base
from ecus_api.db.session import Database
from ecus_api.main import create_app
from ecus_api.modules.reference.models import DeclarationProfile


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        database_url=SecretStr(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"),
        storage_root=tmp_path / "files",
        ai_base_url="https://provider.example/v1",
        ai_api_key=SecretStr("test-key"),
        ai_extraction_model="test-model",
    )


@pytest.fixture
async def database(settings: Settings) -> AsyncIterator[Database]:
    db = Database(settings)
    async with db.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with db.sessions() as session:
        session.add(DeclarationProfile(code="TEST", name="Test profile", enabled=True))
        await session.commit()
    yield db
    await db.close()


@pytest.fixture
async def client(settings: Settings, database: Database) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings)
    async with LifespanManager(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http_client:
            yield http_client
