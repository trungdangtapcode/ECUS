import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from ecus_api.core.config import Settings
from ecus_api.db import models  # noqa: F401
from ecus_api.db.base import Base

url = Settings().database_url.get_secret_value()  # type: ignore[call-arg]


def run_migrations_offline() -> None:
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def configure(connection):  # type: ignore[no-untyped-def]
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(url)
    async with engine.connect() as connection:
        await connection.run_sync(configure)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
