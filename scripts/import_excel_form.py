"""Explicitly import a private XLS as a sanitized, idempotent template profile."""

import argparse
import asyncio
import base64
import json
import sys
from pathlib import Path

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.session import Database
from ecus_api.modules.review.legacy_excel import blank_xls_to_xlsx
from ecus_api.modules.review.native_excel import edit_native
from ecus_api.modules.review.presentation import apply_presentation
from ecus_api.modules.review.schemas import TemplateInput
from ecus_api.modules.review.service import validate_template
from ecus_api.modules.review.template_library import Layout, TemplateProfile, expand_layout
from ecus_api.storage.local import LocalBlobStore


async def main(source: Path, contract: Path, labels_path: Path, retire_profiles: list[str]) -> None:
    settings = Settings()  # type: ignore[call-arg]
    layout = Layout.model_validate_json(await asyncio.to_thread(contract.read_text))
    if layout.id in retire_profiles:
        raise ValueError("The imported profile cannot also be retired")
    content = (
        await asyncio.to_thread(sys.stdin.buffer.read, settings.review_max_file_bytes + 1)
        if source == Path("-")
        else await asyncio.to_thread(source.read_bytes)
    )
    if len(content) > settings.review_max_file_bytes:
        raise ValueError("Form exceeds the configured file size limit")
    labels = json.loads(await asyncio.to_thread(labels_path.read_text))

    def translate(key: str) -> str:
        value = labels
        for part in key.split("."):
            value = value[part]
        if not isinstance(value, str):
            raise ValueError("Excel heading must resolve to a locale string")
        return value

    translated = layout.model_copy(
        update={
            "headings": {
                sheet: {cell: translate(key) for cell, key in headings.items()}
                for sheet, headings in layout.headings.items()
            }
        }
    )
    sanitized = (
        await asyncio.to_thread(edit_native, content, {}, captions=layout.caption_cells)
        if layout.file_format == "xls"
        else await asyncio.to_thread(blank_xls_to_xlsx, content, translated)
    )
    sanitized = await asyncio.to_thread(
        apply_presentation, sanitized, layout.file_format, layout.presentation
    )
    # Validate all mappings, including maximum repeated record capacity.
    expanded, mappings, _ = await asyncio.to_thread(
        expand_layout, sanitized, layout, {group.key: group.maximum for group in layout.groups}
    )
    await asyncio.to_thread(
        validate_template,
        expanded,
        TemplateInput(
            revision=0,
            filename=f"blank.{layout.file_format}",
            content_base64=base64.b64encode(expanded).decode(),
            version=layout.version,
            mapping_version=layout.version,
            mappings=mappings,
        ),
        settings.review_max_file_bytes,
    )
    store = LocalBlobStore(settings.storage_root)
    database = Database(settings)
    try:
        async with database.sessions() as session:
            existing = await session.get(TemplateProfile, layout.id)
            definition = layout.model_dump(mode="json")
            if existing:
                if Layout.model_validate(existing.definition) != layout:
                    raise AppError(
                        "version_conflict",
                        "Changed contracts require a new profile identifier.",
                        409,
                    )
                # Read/validate the existing blob; never refresh it from shipment values.
                await asyncio.to_thread(store.read, existing.storage_key)
            else:
                key = await asyncio.to_thread(store.put, sanitized)
                session.add(
                    TemplateProfile(
                        id=layout.id, definition=definition, storage_key=key, enabled=True
                    )
                )
            for identifier in retire_profiles:
                retired = await session.get(TemplateProfile, identifier)
                if retired:
                    retired.enabled = False
            await session.commit()
        print(
            f"Imported sanitized template profile {layout.id} ({layout.version}). "
            "No shipment values were imported."
        )
    finally:
        await database.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("contract", type=Path)
    parser.add_argument("--labels", type=Path, default=Path("apps/web/src/locales/vi.json"))
    parser.add_argument("--retire-profile", action="append", default=[])
    args = parser.parse_args()
    asyncio.run(main(args.source, args.contract, args.labels, args.retire_profile))
