"""Lifecycle operations preserve archived evidence and isolate permanent deletion."""

from uuid import UUID

import httpx
import pytest
from sqlalchemy import select
from test_review import new_case, pdf_bytes, template_bytes, upload

from ecus_api.db.session import Database
from ecus_api.jobs.models import ProcessingJob
from ecus_api.modules.review.models import CaseReview


async def test_archive_preserves_workspace_documents_and_exports(
    client: httpx.AsyncClient,
) -> None:
    root = await new_case(client)
    case = root.removesuffix("/review")
    state = (
        await client.post(
            f"{root}/documents", json=upload(pdf_bytes(["Invoice", "21000"]), "invoice.pdf", 0)
        )
    ).json()["workspace"]
    state = (
        await client.post(
            f"{root}/template",
            json={
                **upload(template_bytes(), "layout.xlsx", state["revision"]),
                "version": "archive-test",
                "mapping_version": "archive-test",
                "mappings": [
                    {"field": "quantity", "sheet": "Review", "cell": "B2", "required": False}
                ],
            },
        )
    ).json()["workspace"]
    exported = await client.post(
        f"{root}/draft-exports",
        json={
            "revision": state["revision"],
            "reason": "Inspect a retained export",
        },
    )
    assert exported.status_code == 200, exported.text
    before = exported.json()
    document = f"{root}/documents/{before['workspace']['documents'][0]['id']}/content"
    excel = f"{root}/exports/{before['workspace']['exports'][0]['id']}/content"
    document_bytes = (await client.get(document)).content
    excel_bytes = (await client.get(excel)).content
    archived = await client.put(f"{case}/archive", json={"archived": True})
    assert archived.status_code == 200
    timestamp = archived.json()["archived_at"]
    assert timestamp
    assert (await client.put(f"{case}/archive", json={"archived": True})).json()[
        "archived_at"
    ] == timestamp
    assert (await client.get("/api/v1/cases")).json()["total"] == 0
    assert (await client.get("/api/v1/cases?archived=true")).json()["total"] == 1
    assert (await client.get(root)).json() == before
    assert (await client.get(document)).content == document_bytes
    assert (await client.get(excel)).content == excel_bytes
    for route, body in [
        ("/processing", {"revision": before["workspace"]["revision"]}),
        (
            "/approve",
            {"revision": before["workspace"]["revision"], "reason": "Cannot edit archive"},
        ),
        (
            "/draft-exports",
            {"revision": before["workspace"]["revision"], "reason": "Cannot export archive"},
        ),
        (
            "/documents",
            upload(pdf_bytes(["New source"]), "new.pdf", before["workspace"]["revision"]),
        ),
    ]:
        response = await client.post(root + route, json=body)
        assert response.status_code == 409, response.text
        assert response.json()["error"]["code"] == "case_archived"
    assert (await client.put(f"{case}/archive", json={"archived": False})).json()[
        "archived_at"
    ] is None
    assert (await client.get("/api/v1/cases")).json()["total"] == 1
    assert (await client.get("/api/v1/cases?archived=true")).json()["total"] == 0
    assert (await client.get(root)).json() == before


@pytest.mark.parametrize("status", ["pending", "running"])
async def test_active_jobs_block_archive_and_delete(
    client: httpx.AsyncClient,
    database: Database,
    status: str,
) -> None:
    root = await new_case(client)
    case = root.removesuffix("/review")
    record = (await client.get(case)).json()
    async with database.sessions() as session:
        session.add(
            ProcessingJob(kind="synthetic", status=status, payload={"case_id": record["id"]})
        )
        await session.commit()
    responses = [
        await client.put(f"{case}/archive", json={"archived": True}),
        await client.request("DELETE", case, json={"reference": record["reference"]}),
    ]
    for response in responses:
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "case_processing_active"
    assert (await client.get(case)).json()["archived_at"] is None


async def test_delete_requires_confirmation_and_preserves_other_case_shared_file(
    client: httpx.AsyncClient,
    database: Database,
) -> None:
    root = await new_case(client)
    other = await new_case(client)
    case = root.removesuffix("/review")
    record = (await client.get(case)).json()
    pdf = pdf_bytes(["Shared synthetic source", "1250"])
    for url in [root, other]:
        assert (
            await client.post(f"{url}/documents", json=upload(pdf, "source.pdf", 0))
        ).status_code == 200
    other_before = (await client.get(other)).json()
    other_document = f"{other}/documents/{other_before['workspace']['documents'][0]['id']}/content"
    wrong = await client.request("DELETE", case, json={"reference": "WRONG"})
    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "case_reference_mismatch"
    assert (await client.get(case)).status_code == 200
    async with database.sessions() as session:
        job = ProcessingJob(kind="synthetic", status="succeeded", payload={"case_id": record["id"]})
        session.add(job)
        await session.commit()
        job_id = job.id
    assert (await client.put(f"{case}/archive", json={"archived": True})).status_code == 200
    assert (
        await client.request("DELETE", case, json={"reference": record["reference"]})
    ).status_code == 204
    for url in [case, root, f"/api/v1/jobs/{job_id}"]:
        assert (await client.get(url)).status_code == 404
    assert (await client.get("/api/v1/cases?archived=true")).json()["total"] == 0
    assert (await client.get(other)).json() == other_before
    assert (await client.get(other_document)).content == pdf
    async with database.sessions() as session:
        assert (
            await session.scalar(select(CaseReview).where(CaseReview.case_id == UUID(record["id"])))
            is None
        )
    # Deleted references may be reused, but archival must retain the uniqueness constraint.
    assert (
        await client.post(
            "/api/v1/cases",
            json={
                "reference": record["reference"],
                "title": "Fresh case",
                "procedure": "TEST",
            },
        )
    ).status_code == 201
