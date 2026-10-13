"""Synthetic line matching checks document identity instead of row position."""

import json

import httpx
import pytest
from test_processing import configured, finished
from test_review import pdf_bytes, upload

from ecus_api.ai.contracts import AIResult
from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.config import Settings
from ecus_api.db.session import Database


async def test_multiple_invoices_do_not_silently_skip_goods_fields(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root, state = await configured(client, database, settings)
    state = (
        await client.post(
            f"{root}/template-profile",
            json={
                "revision": state["revision"],
                "profile_id": "synthetic-form-v1",
                "counts": {"goods": 1},
                "reason": "One goods line needs a primary invoice",
            },
        )
    ).json()["workspace"]
    for name, description in [("first.pdf", "Alpha"), ("second.pdf", "Beta")]:
        state = (
            await client.post(
                f"{root}/documents",
                json=upload(pdf_bytes(["Invoice", description]), name, state["revision"]),
            )
        ).json()["workspace"]

    async def fake(_self, text, schema, **_kwargs):
        prompt = json.loads(text)
        assert prompt["requested_fields"] == []
        return AIResult(
            value=schema.model_validate(
                {
                    "sections": [
                        {
                            "document_type": "INVOICE",
                            "page_from": 1,
                            "page_to": 1,
                            "heading_quote": "Invoice",
                            "confidence": 0.9,
                        }
                    ],
                    "fields": [],
                }
            ),
            model="mock",
            usage={},
            request_id=None,
            prompt_version="v1",
        )

    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    assert (
        await client.post(f"{root}/processing", json={"revision": state["revision"]})
    ).status_code == 202
    run = await finished(client, root)
    assert run["status"] == "failed" and run["error_code"] == "primary_invoice_required"
    assert (await client.get(root)).json()["workspace"] == state


@pytest.mark.parametrize("duplicate_identity", [False, True])
async def test_primary_invoice_and_unique_secondary_line_evidence(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    duplicate_identity: bool,
) -> None:
    root, state = await configured(client, database, settings)
    state = (
        await client.post(
            f"{root}/template-profile",
            json={
                "revision": state["revision"],
                "profile_id": "synthetic-form-v1",
                "counts": {"goods": 2},
                "reason": "Two invoice lines",
            },
        )
    ).json()["workspace"]
    # Upload packing first to ensure task order is derived from the primary invoice.
    for name, content in [
        ("packing.pdf", pdf_bytes(["PACKING LIST", "Beta", "Alpha"])),
        ("invoice.pdf", pdf_bytes(["Invoice", "Alpha", "Beta"])),
    ]:
        state = (
            await client.post(f"{root}/documents", json=upload(content, name, state["revision"]))
        ).json()["workspace"]
    seen_context = []

    async def fake(_self, text, schema, **_kwargs):
        prompt = json.loads(text)
        primary = "Invoice" in prompt["pages"][0]["text"]
        kind, heading = ("INVOICE", "Invoice") if primary else ("PACKING_LIST", "PACKING LIST")
        fields = []
        if prompt["requested_fields"]:
            if primary:
                values = [
                    ("goods_001_description", "Alpha", None),
                    ("goods_002_description", "Alpha" if duplicate_identity else "Beta", None),
                ]
            else:
                seen_context.append(prompt["primary_invoice_lines"])
                values = [
                    ("goods_001_description", "Beta", "Beta"),
                    ("goods_002_description", "Alpha", "Alpha"),
                    (
                        "goods_002_description",
                        "Alpha" if duplicate_identity else "Beta",
                        "Alpha" if duplicate_identity else "Beta",
                    ),
                ]
            fields = [
                dict(
                    field=field,
                    document_type=kind,
                    page=1,
                    quote=quote,
                    line_identity_quote=identity,
                    source_offset=None,
                    unit="",
                    number_locale="en",
                    confidence=0.9,
                )
                for field, quote, identity in values
            ]
        return AIResult(
            value=schema.model_validate(
                {
                    "sections": [
                        dict(
                            document_type=kind,
                            page_from=1,
                            page_to=1,
                            heading_quote=heading,
                            confidence=0.9,
                        )
                    ],
                    "fields": fields,
                }
            ),
            model="mock",
            usage={},
            request_id=None,
            prompt_version="v1",
        )

    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    assert (
        await client.post(f"{root}/processing", json={"revision": state["revision"]})
    ).status_code == 202
    run = await finished(client, root)
    assert run["status"] == "succeeded"
    assert seen_context[0]["goods_001"]["description"] == "Alpha"
    sources = (await client.get(root)).json()["workspace"]["observations"]
    secondary = [
        source for source in sources if source["document_id"] == state["documents"][0]["id"]
    ]
    if duplicate_identity:
        assert not secondary and run["rejected_count"] == 3
    else:
        assert len(secondary) == 1 and secondary[0]["field"] == "goods_002_description"
        assert secondary[0]["quote"] == "Beta" and run["rejected_count"] == 2
        assert secondary[0]["line_identity_quote"] == "Beta"
        assert secondary[0]["primary_line_source_ids"]
