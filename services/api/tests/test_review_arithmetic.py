"""Review arithmetic uses generated PDFs, templates and no provider requests."""

import base64

import httpx
import pytest
from test_review import new_case, pdf_bytes, template_bytes, upload


@pytest.mark.parametrize(
    ("quantity", "price", "amount", "expected"),
    [("100", "2", "199", "200.00"), ("10", "1.2345", "12.34", "12.35")],
)
async def test_reviewed_correction_rechecks_arithmetic_and_export_gate(
    client: httpx.AsyncClient, quantity: str, price: str, amount: str, expected: str
) -> None:
    root = await new_case(client)
    state = {"revision": 0}

    async def post(path: str, body: dict) -> dict:
        nonlocal state
        response = await client.post(root + path, json={"revision": state["revision"], **body})
        assert response.status_code == 200, response.text
        data = response.json()
        state = data["workspace"]
        return data

    await post(
        "/policy",
        {
            "reason": "Use explicit synthetic line arithmetic",
            "policy": {
                "version": "arithmetic-v1",
                "name": "Synthetic arithmetic",
                "status": "project_baseline",
                "fields": [
                    {"field": field, "label": field.title(), "value_type": "decimal"}
                    for field in ["quantity", "price", "amount"]
                ],
                "arithmetic_checks": [
                    {
                        "key": "line_amount",
                        "label": "Synthetic line amount",
                        "factors": ["quantity", "price"],
                        "result_field": "amount",
                    }
                ],
            },
        },
    )
    await post(
        "/template",
        {
            "filename": "synthetic.xlsx",
            "content_base64": base64.b64encode(template_bytes()).decode(),
            "version": "v1",
            "mapping_version": "v1",
            "mappings": [
                {"field": field, "sheet": "Review", "cell": cell}
                for field, cell in [("quantity", "B2"), ("price", "B3"), ("amount", "B4")]
            ],
        },
    )
    await post(
        "/documents", upload(pdf_bytes([quantity, price, amount]), "source.pdf", state["revision"])
    )
    document_id = state["documents"][0]["id"]
    await post(
        "/logical-documents",
        {
            "document_id": document_id,
            "document_type": "INVOICE",
            "page_from": 1,
            "page_to": 1,
            "reason": "Checked source heading",
        },
    )
    for field, quote in [("quantity", quantity), ("price", price), ("amount", amount)]:
        await post(
            "/observations",
            {
                "field": field,
                "document_id": document_id,
                "document_type": "INVOICE",
                "page": 1,
                "quote": quote,
                "value_type": "decimal",
                "verified": True,
            },
        )
        data = await post(
            f"/fields/{field}/selection",
            {
                "observation_id": state["observations"][-1]["id"],
                "reason": "Selected printed source",
            },
        )
    check = data["readiness"]["arithmetic_checks"][0]
    assert check["status"] == "MISMATCH" and check["expected"] == expected
    assert check["actual"] == amount
    assert "amount:arithmetic_mismatch" in data["readiness"]["blockers"]
    # Explicitly reviewed manual input still cannot bypass inconsistent arithmetic.
    data = await post(
        "/fields/amount/canonical",
        {"value": amount, "reason": "Rechecked amount", "reviewed": True},
    )
    assert "amount:arithmetic_mismatch" in data["readiness"]["blockers"]
    for endpoint in ["/approve", "/exports"]:
        body = {"revision": state["revision"]}
        if endpoint == "/approve":
            body["reason"] = "Attempt inconsistent approval"
        assert (await client.post(root + endpoint, json=body)).status_code == 409
    data = await post(
        "/fields/amount/canonical",
        {"value": expected, "reason": "Corrected against source arithmetic", "reviewed": True},
    )
    assert data["readiness"]["eligible"]
    assert data["readiness"]["arithmetic_checks"][0]["status"] == "MATCH"
    await post("/approve", {"reason": "Reviewed corrected result"})
    data = await post("/exports", {})
    assert data["workspace"]["exports"][-1]["values_snapshot"]["amount"] == expected
