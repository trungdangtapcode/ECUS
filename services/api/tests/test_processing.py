"""Synthetic whole-set processing tests; AI and OCR transports are replaced."""

import asyncio
import io
import json
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from openpyxl import load_workbook
from pypdf import PdfWriter
from test_integration import register_profile
from test_review import new_case, pdf_bytes, upload

from ecus_api.ai.contracts import AIResult
from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.session import Database
from ecus_api.jobs.models import ProcessingJob
from ecus_api.modules.review.domain import comparison_value, normalize_field
from ecus_api.modules.review.policy import FieldRule
from ecus_api.modules.review.processing import page_batches
from ecus_api.modules.review.schemas import Observation, OCRPage
from ecus_api.storage import ocr


async def configured(
    client: httpx.AsyncClient, database: Database, settings: Settings
) -> tuple[str, dict]:
    await register_profile(database, settings)
    root = await new_case(client)
    response = await client.post(
        f"{root}/template-profile",
        json={
            "revision": 0,
            "profile_id": "synthetic-form-v1",
            "counts": {"goods": 0},
            "reason": "Selected blank layout",
        },
    )
    assert response.status_code == 200
    return root, response.json()["workspace"]


async def finished(client: httpx.AsyncClient, root: str) -> dict:
    for _ in range(200):
        run = (await client.get(f"{root}/processing")).json()[0]
        if run["status"] not in {"pending", "running"}:
            return run
        await asyncio.sleep(0.01)
    pytest.fail("Processing did not complete")


async def test_whole_set_conflict_review_and_red_excel_export(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root, state = await configured(client, database, settings)
    settings.extraction_field_batch_size = 1
    calls = []

    async def fake(_self, text, schema, **_kwargs):
        prompt = json.loads(text)
        calls.append(prompt)
        assert len(prompt["requested_fields"]) <= 1
        page = prompt["pages"][0]
        kind = "INVOICE" if "Invoice" in page["text"] else "B/L"
        heading = "Invoice" if kind == "INVOICE" else "BILL OF LADING"
        fields = []
        field = prompt["requested_fields"][0]["field"] if prompt["requested_fields"] else None
        if field == "quantity":
            quote = "21,000" if kind == "INVOICE" else "22,000"
        elif field == "identifier" and kind == "INVOICE":
            quote = "00042"
        else:
            quote = "unsupported fabricated value"
        if field:
            fields.append(
                dict(
                    field=field,
                    document_type=kind,
                    page=1,
                    quote=quote,
                    unit="KG" if field == "quantity" else "",
                    number_locale="en",
                    confidence=0.95,
                    source_offset=1,
                )
            )
        return AIResult(
            value=schema.model_validate(
                {
                    "sections": [
                        dict(
                            document_type=kind,
                            page_from=1,
                            page_to=1,
                            heading_quote=heading,
                            confidence=0.99,
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
    originals = [pdf_bytes(["Invoice", "21,000", "00042"]), pdf_bytes(["BILL OF LADING", "22,000"])]
    for index, content in enumerate(originals):
        response = await client.post(
            f"{root}/documents", json=upload(content, f"source-{index}.pdf", state["revision"])
        )
        state = response.json()["workspace"]
    response = await client.post(f"{root}/processing", json={"revision": state["revision"]})
    assert response.status_code == 202
    run = await finished(client, root)
    assert run["status"] == "succeeded", run
    assert run["accepted_count"] == 3 and run["rejected_count"] == 3 and run["applied"]
    assert len(calls) == 8
    async with database.sessions() as session:
        job = await session.get(ProcessingJob, UUID(run["id"]))
        assert job is not None and job.result is not None
        outcomes = job.result["field_outcomes"]
        assert outcomes["quantity"]["requested"] == 2
        assert outcomes["quantity"]["accepted"] == 2
        assert outcomes["missing"]["rejections"] == {"source_quote_missing": 2}
    data = (await client.get(root)).json()
    state = data["workspace"]
    assert all(not source["verified"] for source in state["observations"])
    assert len(state["logical_documents"]) == 2
    assert not next(
        item for item in data["readiness"]["comparisons"] if item["field"] == "quantity"
    )["consistent"]
    # A conflicting batch must leave every field untouched.
    invalid = await client.post(
        f"{root}/confirm-fields",
        json={
            "revision": state["revision"],
            "fields": ["identifier", "quantity"],
            "reason": "Review selected fields",
        },
    )
    assert invalid.status_code == 422
    assert (await client.get(root)).json()["workspace"] == state
    response = await client.post(
        f"{root}/confirm-fields",
        json={
            "revision": state["revision"],
            "fields": ["identifier"],
            "reason": "Checked identifier against the original",
        },
    )
    assert response.status_code == 200
    state = response.json()["workspace"]
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": "21050",
            "reason": "Confirmed corrected quantity using supporting evidence",
            "reviewed": True,
        },
    )
    assert response.status_code == 200
    data, state = response.json(), response.json()["workspace"]
    assert data["readiness"]["eligible"]
    assert all(
        not item["verified"] for item in state["observations"] if item["field"] == "quantity"
    )
    response = await client.post(
        f"{root}/approve",
        json={
            "revision": state["revision"],
            "reason": "Reviewed output and accepted red missing cells",
        },
    )
    state = response.json()["workspace"]
    response = await client.post(f"{root}/exports", json={"revision": state["revision"]})
    assert response.status_code == 200
    record = response.json()["workspace"]["exports"][0]
    workbook = load_workbook(
        io.BytesIO((await client.get(f"{root}/exports/{record['id']}/content")).content)
    )
    assert workbook["Form"]["B2"].value == 21050
    assert workbook["Form"]["B3"].value == "00042"
    assert workbook["Form"]["D2"].value is None
    assert workbook["Form"]["D2"].fill.fgColor.rgb == "FFF2CCCC"
    for index, document in enumerate(state["documents"]):
        assert (
            await client.get(f"{root}/documents/{document['id']}/content")
        ).content == originals[index]


async def test_scan_ocr_exact_repeated_quote_and_processing_lock(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root, state = await configured(client, database, settings)
    writer = PdfWriter()
    writer.add_blank_page(width=600, height=800)
    buffer = io.BytesIO()
    writer.write(buffer)
    original = buffer.getvalue()
    state = (
        await client.post(f"{root}/documents", json=upload(original, "scan.pdf", state["revision"]))
    ).json()["workspace"]
    started, release = asyncio.Event(), asyncio.Event()

    async def recognize(_content, _page, _settings):
        return OCRPage(text="Invoice\n21,000\n21,000", words=[], confidence=0.9)

    async def fake(_self, _text, schema, **_kwargs):
        started.set()
        await release.wait()
        return AIResult(
            value=schema.model_validate(
                {
                    "sections": [
                        dict(
                            document_type="INVOICE",
                            page_from=1,
                            page_to=1,
                            heading_quote="Invoice",
                            confidence=0.9,
                        )
                    ],
                    "fields": [
                        dict(
                            field="quantity",
                            document_type="INVOICE",
                            page=1,
                            quote="21,000",
                            source_offset=15,
                            unit="KG",
                            number_locale="en",
                            confidence=0.9,
                        )
                    ],
                }
            ),
            model="mock",
            usage={},
            request_id=None,
            prompt_version="v1",
        )

    monkeypatch.setattr(ocr, "recognize", recognize)
    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    run = (await client.post(f"{root}/processing", json={"revision": state["revision"]})).json()
    await asyncio.wait_for(started.wait(), 5)
    duplicate = await client.post(f"{root}/processing", json={"revision": state["revision"]})
    assert duplicate.status_code == 202 and duplicate.json()["id"] == run["id"]
    blocked = await client.post(
        f"{root}/fields/quantity/canonical",
        json={"revision": state["revision"], "value": "1", "reason": "Concurrent edit"},
    )
    assert (
        blocked.status_code == 409 and blocked.json()["error"]["code"] == "review_processing_active"
    )
    release.set()
    assert (await finished(client, root))["status"] == "succeeded"
    data = (await client.get(root)).json()
    source = data["workspace"]["observations"][0]
    assert source["source_kind"] == "ocr" and source["offset"] == 15
    assert data["workspace"]["documents"][0]["pages"] == [""]
    assert data["workspace"]["documents"][0]["ocr_pages"]["1"]["text"].endswith("21,000")
    assert (
        await client.get(f"{root}/documents/{source['document_id']}/content")
    ).content == original


async def test_empty_processing_result_does_not_report_a_successful_review(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root, state = await configured(client, database, settings)
    state = (
        await client.post(
            f"{root}/documents",
            json=upload(pdf_bytes(["Invoice"]), "invoice.pdf", state["revision"]),
        )
    ).json()["workspace"]

    async def fake(_self, _text, schema, **_kwargs):
        return AIResult(
            value=schema.model_validate({"sections": [], "fields": []}),
            model="mock",
            usage={},
            request_id=None,
            prompt_version="v1",
        )

    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    response = await client.post(f"{root}/processing", json={"revision": state["revision"]})
    assert response.status_code == 202
    run = await finished(client, root)
    assert run["status"] == "failed" and run["error_code"] == "extraction_empty"
    assert not run["applied"]
    # No partial classification, observations or approvals are saved after an empty run.
    assert (await client.get(root)).json()["workspace"] == state


@pytest.mark.parametrize("exact_quote", [True, False])
async def test_image_evidence_is_forwarded_but_cannot_bypass_text_validation(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    exact_quote: bool,
) -> None:
    root, state = await configured(client, database, settings)
    settings.extraction_use_page_images = True
    state = (
        await client.post(
            f"{root}/documents",
            json=upload(pdf_bytes(["Invoice", "21,000"]), "synthetic.pdf", state["revision"]),
        )
    ).json()["workspace"]
    calls = []

    async def fake(_self, text, schema, **kwargs):
        prompt = json.loads(text)
        images = kwargs.get("images", ())
        fields = []
        if prompt["requested_fields"]:
            assert prompt["image_page_numbers"] == [1]
            assert len(images) == 1 and images[0].mime_type == "image/jpeg"
            assert images[0].data.startswith(b"\xff\xd8")
            fields = [
                dict(
                    field="quantity",
                    document_type="INVOICE",
                    page=1,
                    quote="21,000" if exact_quote else "99,999",
                    unit="KG",
                    number_locale="en",
                    confidence=0.9,
                )
            ]
        calls.append(bool(images))
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
    assert calls == [False, True]
    if exact_quote:
        assert run["status"] == "succeeded" and run["accepted_count"] == 1
        result = (await client.get(root)).json()["workspace"]
        assert result["observations"][0]["normalized"] == "21000"
        assert not result["observations"][0]["verified"]
    else:
        assert run["status"] == "failed" and run["rejection_reasons"] == {"source_quote_missing": 1}
        assert (await client.get(root)).json()["workspace"] == state


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("FEB. 29, 2024", "2024-02-29"),
        ("Feb 29, 2024", "2024-02-29"),
        ("February 29, 2024", "2024-02-29"),
        ("03/04/2030", "2030-04-03"),
    ],
)
def test_explicit_named_month_dates_preserve_calendar_and_day_first_rules(
    source: str, expected: str
) -> None:
    rule = FieldRule(field="date", label="Date", normalization="date")
    assert normalize_field(source, rule, "", "en")[0] == expected


def test_invalid_named_month_date_is_not_inferred() -> None:
    rule = FieldRule(field="date", label="Date", normalization="date")
    with pytest.raises(AppError) as invalid:
        normalize_field("FEB. 30, 2024", rule, "", "en")
    assert invalid.value.code == "invalid_date_source"


def test_ocr_positions_and_conservative_normalization() -> None:
    result = ocr.parse_tsv(
        "level\tblock_num\tpar_num\tline_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t10\t20\t30\t10\t90\tInvoice\n5\t1\t1\t2\t10\t40\t30\t10\t80\t00042\n",
        100,
        100,
    )
    assert result.text == "Invoice\n00042" and result.words[1].offset == 8
    assert result.words[1].box == [0.1, 0.4, 0.4, 0.5]
    date = FieldRule(field="date", label="Date", normalization="date")
    assert normalize_field("13-Aug-2026", date, "", "en")[0] == "2026-08-13"
    with pytest.raises(AppError):
        normalize_field("31/02/2026", date, "", "en")
    currency = FieldRule(field="currency", label="Currency", normalization="currency")
    assert normalize_field("US$", currency, "", "en")[0] == "USD"
    assert normalize_field("$", currency, "", "en")[0] != "USD"
    identifier = FieldRule(field="identifier", label="Identifier", normalization="identifier")
    source = Observation(
        id=uuid4(),
        field="identifier",
        document_id=uuid4(),
        document_type="INVOICE",
        page=1,
        quote="000-42",
        offset=0,
        normalized="000-42",
        value_type="text",
        unit="",
        verified=True,
    )
    assert comparison_value(source, identifier)[2] == "00042"
    assert source.normalized == "000-42"


def test_real_pdf_renderer_closes_native_handles(settings: Settings, tmp_path: Path) -> None:
    content = pdf_bytes(["Synthetic renderer test"])
    path = tmp_path / "page.png"
    width, height = ocr.render(content, 1, path, 0, settings)
    assert path.is_file() and width < height
    rotated = ocr.render(content, 1, path, 90, settings)
    assert rotated == (height, width)


async def test_blank_pages_keep_physical_page_numbers_and_original_pdf(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from pypdf import PdfReader

    root, state = await configured(client, database, settings)
    writer = PdfWriter()
    writer.add_blank_page(width=600, height=800)
    writer.add_page(PdfReader(io.BytesIO(pdf_bytes(["Invoice", "00042"]))).pages[0])
    writer.add_blank_page(width=600, height=800)
    buffer = io.BytesIO()
    writer.write(buffer)
    original = buffer.getvalue()
    response = await client.post(
        f"{root}/documents", json=upload(original, "invoice.pdf", state["revision"])
    )
    state = response.json()["workspace"]

    async def fake(_self, text, schema, **_kwargs):
        prompt = json.loads(text)
        assert [page["page"] for page in prompt["pages"]] == [2]
        fields = (
            [
                dict(
                    field="identifier",
                    document_type="INVOICE",
                    page=2,
                    quote="00042",
                    unit="",
                    number_locale="en",
                    confidence=0.99,
                )
            ]
            if prompt["requested_fields"]
            else []
        )
        return AIResult(
            value=schema.model_validate(
                {
                    "sections": [
                        dict(
                            document_type="INVOICE",
                            page_from=2,
                            page_to=2,
                            heading_quote="Invoice",
                            confidence=0.99,
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
    response = await client.post(f"{root}/processing", json={"revision": state["revision"]})
    assert response.status_code == 202
    run = await finished(client, root)
    assert run["status"] == "succeeded", run
    data = (await client.get(root)).json()
    document = data["workspace"]["documents"][0]
    assert document["ocr_pages"]["1"]["is_blank"]
    assert document["ocr_pages"]["3"]["is_blank"]
    assert len(document["pages"]) == 3
    assert data["workspace"]["observations"][0]["page"] == 2
    assert "invoice.pdf:source_unreadable" not in data["readiness"]["blockers"]
    assert (await client.get(f"{root}/documents/{document['id']}/content")).content == original
    assert page_batches(["", "Invoice", ""], settings)[0][0]["page"] == 2


async def test_entirely_blank_document_fails_before_ai(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root, state = await configured(client, database, settings)
    writer = PdfWriter()
    writer.add_blank_page(width=600, height=800)
    buffer = io.BytesIO()
    writer.write(buffer)
    state = (
        await client.post(
            f"{root}/documents", json=upload(buffer.getvalue(), "empty.pdf", state["revision"])
        )
    ).json()["workspace"]

    async def forbidden(*_args, **_kwargs):
        pytest.fail("Blank documents must not trigger a paid AI call")

    monkeypatch.setattr(OpenAICompatible, "extract_document", forbidden)
    await client.post(f"{root}/processing", json={"revision": state["revision"]})
    run = await finished(client, root)
    assert run["status"] == "failed" and run["error_code"] == "ocr_empty"
    assert "empty.pdf:source_unreadable" in (await client.get(root)).json()["readiness"]["blockers"]


async def test_faint_marks_are_not_treated_as_blank(settings: Settings) -> None:
    from pypdf.generic import DecodedStreamObject, NameObject

    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    stream = DecodedStreamObject()
    stream.set_data(b"0.99 g 20 20 200 200 re f")
    page[NameObject("/Contents")] = writer._add_object(stream)
    buffer = io.BytesIO()
    writer.write(buffer)
    settings.ocr_command = "nonexistent-ocr-test-command"
    with pytest.raises(AppError) as caught:
        await ocr.recognize(buffer.getvalue(), 1, settings)
    assert caught.value.code == "ocr_unavailable"
