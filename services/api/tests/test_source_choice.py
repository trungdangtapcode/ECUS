"""Reviewed source choices preserve exact evidence without altering other proposals."""

import io
from uuid import uuid4

import httpx
import pytest
from openpyxl import load_workbook
from test_integration import register_profile
from test_review import new_case, pdf_bytes, upload

from ecus_api.core.config import Settings
from ecus_api.db.session import Database


async def prepare_sources(
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
            "reason": "Configure a synthetic source choice",
        },
    )
    state = response.json()["workspace"]
    for index, quote in enumerate(["100", "101"]):
        response = await client.post(
            f"{root}/documents",
            json=upload(pdf_bytes([quote, "IDENTIFIER"]), f"source-{index}.pdf", state["revision"]),
        )
        assert response.status_code == 200
        state = response.json()["workspace"]
        response = await client.post(
            f"{root}/observations",
            json={
                "revision": state["revision"],
                "field": "quantity",
                "document_id": state["documents"][-1]["id"],
                "document_type": "INVOICE",
                "page": 1,
                "quote": quote,
                "value_type": "decimal",
                "unit": "KG",
                "verified": False,
            },
        )
        assert response.status_code == 200
        state = response.json()["workspace"]
    return root, state


async def test_source_choice_keeps_provenance_and_manual_edit_available(
    client: httpx.AsyncClient, database: Database, settings: Settings
) -> None:
    root, state = await prepare_sources(client, database, settings)
    original_sources = state["observations"]
    chosen = original_sources[-1]
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": "101.0",
            "source_observation_id": chosen["id"],
            "reason": "Reviewed the second document",
            "reviewed": True,
        },
    )
    assert response.status_code == 200, response.text
    state = response.json()["workspace"]
    canonical = state["canonical_values"]["quantity"]
    assert canonical["value"] == "101" and canonical["unit"] == "KG"
    assert canonical["source_observation_id"] == chosen["id"]
    assert canonical["source_ids"] == [chosen["id"]]
    assert state["observations"] == original_sources
    assert not any(item["verified"] for item in state["observations"])
    comparison = next(
        item for item in response.json()["readiness"]["comparisons"] if item["field"] == "quantity"
    )
    assert comparison["resolved"] and comparison["source_values_differ"]
    assert state["audit"][-1]["action"] == "canonical_value_selected"
    assert chosen["id"] in state["audit"][-1]["detail"]
    response = await client.post(
        f"{root}/draft-exports", json={"revision": state["revision"], "reason": "Review copy"}
    )
    assert response.status_code == 200
    state = response.json()["workspace"]
    record = state["exports"][-1]
    assert record["canonical_snapshot"]["quantity"]["source_observation_id"] == chosen["id"]
    content = (await client.get(f"{root}/exports/{record['id']}/content")).content
    workbook = load_workbook(io.BytesIO(content))
    assert workbook["Form"]["B2"].value == 101
    workbook.close()
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": "102.5",
            "reason": "Reviewed a different consolidated value",
            "reviewed": True,
        },
    )
    assert response.status_code == 200
    state = response.json()["workspace"]
    assert state["canonical_values"]["quantity"]["value"] == "102.5"
    assert state["canonical_values"]["quantity"]["source_observation_id"] is None
    assert state["canonical_history"][-1]["quantity"]["source_observation_id"] == chosen["id"]
    assert state["observations"] == original_sources
    assert (await client.get(f"{root}/exports/{record['id']}/content")).content == content


@pytest.mark.parametrize(
    ("scenario", "error_code"),
    [
        ("value_mismatch", "source_value_mismatch"),
        ("unknown_source", "source_not_found"),
        ("other_field", "source_not_found"),
        ("withdrawn_source", "source_not_found"),
        ("withdrawn_document", "source_not_found"),
        ("wrong_unit", "field_rule_mismatch"),
    ],
)
async def test_source_choice_rejects_unrelated_or_modified_evidence(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
    scenario: str,
    error_code: str,
) -> None:
    root, state = await prepare_sources(client, database, settings)
    chosen = state["observations"][-1]
    source_id = chosen["id"]
    value = "101"
    if scenario == "value_mismatch":
        value = "999"
    elif scenario == "unknown_source":
        source_id = str(uuid4())
    elif scenario in {"other_field", "wrong_unit"}:
        document_id = chosen["document_id"]
        if scenario == "wrong_unit":
            response = await client.post(
                f"{root}/documents",
                json=upload(
                    pdf_bytes(["Different unit source", "101"]),
                    "different-unit.pdf",
                    state["revision"],
                ),
            )
            assert response.status_code == 200
            state = response.json()["workspace"]
            document_id = state["documents"][-1]["id"]
        response = await client.post(
            f"{root}/observations",
            json={
                "revision": state["revision"],
                "field": "identifier" if scenario == "other_field" else "quantity",
                "document_id": document_id,
                "document_type": "INVOICE",
                "page": 1,
                "quote": "101",
                "value_type": "decimal",
                "unit": "BOX",
            },
        )
        assert response.status_code == 200
        state = response.json()["workspace"]
        source_id = state["observations"][-1]["id"]
    elif scenario in {"withdrawn_source", "withdrawn_document"}:
        path = (
            f"/observations/{chosen['id']}/withdraw"
            if scenario == "withdrawn_source"
            else f"/documents/{chosen['document_id']}/withdraw"
        )
        response = await client.post(
            root + path, json={"revision": state["revision"], "reason": "Withdraw evidence"}
        )
        assert response.status_code == 200
        state = response.json()["workspace"]
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": value,
            "source_observation_id": source_id,
            "reason": "Attempt an invalid source choice",
            "reviewed": True,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == error_code
    assert (await client.get(root)).json()["workspace"] == state


async def test_source_choice_without_review_remains_blocked(
    client: httpx.AsyncClient, database: Database, settings: Settings
) -> None:
    root, state = await prepare_sources(client, database, settings)
    chosen = state["observations"][-1]
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": chosen["normalized"],
            "source_observation_id": chosen["id"],
            "reason": "Not reviewed yet",
            "reviewed": False,
        },
    )
    assert response.status_code == 200
    assert not response.json()["readiness"]["eligible"]
    assert "quantity:canonical_review_required" in response.json()["readiness"]["blockers"]
