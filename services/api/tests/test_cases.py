import httpx


async def test_case_persistence_and_reference_conflict(client: httpx.AsyncClient) -> None:
    payload = {"reference": "sample-01", "title": "Test shipment", "procedure": "TEST"}
    response = await client.post("/api/v1/cases", json=payload)
    assert response.status_code == 201
    saved = response.json()
    assert saved["reference"] == "SAMPLE-01"
    assert saved["status"] == "draft"
    assert response.headers["X-Request-ID"]
    detail = await client.get(f"/api/v1/cases/{saved['id']}")
    assert detail.json() == saved
    conflict = await client.post("/api/v1/cases", json={**payload, "reference": "SAMPLE-01"})
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "reference_exists"
    listing = await client.get("/api/v1/cases")
    assert listing.json()["total"] == 1


async def test_profiles_are_data_driven_and_case_validation_is_authoritative(
    client: httpx.AsyncClient,
) -> None:
    profiles = (await client.get("/api/v1/reference/profiles")).json()
    assert profiles == [{"code": "TEST", "name": "Test profile"}]
    invalid = await client.post(
        "/api/v1/cases", json={"reference": "R1", "title": "Sample", "procedure": "UNKNOWN"}
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_procedure"
    for patch in ({"title": "   "}, {"reference": "bad value"}, {"status": "ready"}):
        response = await client.post(
            "/api/v1/cases",
            json={"reference": "R1", "title": "Sample", "procedure": "TEST", **patch},
        )
        assert response.status_code == 422
    assert (await client.get("/api/v1/cases?limit=0")).status_code == 422


async def test_health_and_missing_case(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/health/live")).status_code == 200
    assert (await client.get("/api/v1/health/ready")).status_code == 200
    response = await client.get("/api/v1/cases/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "case_not_found"
