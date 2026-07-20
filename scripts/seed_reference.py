"""Explicitly import versioned reference data; never create customer cases."""

import argparse
import asyncio
from pathlib import Path

from ecus_api.core.config import Settings
from ecus_api.db.session import Database
from ecus_api.modules.reference.models import DeclarationProfile
from pydantic import BaseModel, ConfigDict, Field


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=200)
    enabled: bool


class ReferenceData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: str
    source: str
    profiles: list[Profile]


async def main(path: Path) -> None:
    data = ReferenceData.model_validate_json(await asyncio.to_thread(path.read_text))
    if len({profile.code for profile in data.profiles}) != len(data.profiles):
        raise ValueError("Reference data contains duplicate profile codes")
    database = Database(Settings())  # type: ignore[call-arg]
    try:
        async with database.sessions() as session:
            for profile in data.profiles:
                await session.merge(DeclarationProfile(**profile.model_dump()))
            await session.commit()
        print(f"Imported {len(data.profiles)} profiles from {data.version}.")
    finally:
        await database.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    asyncio.run(main(args.path))
