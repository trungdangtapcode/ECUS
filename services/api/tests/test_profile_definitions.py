"""Profile upgrades adopt new meanings explicitly and invalidate affected review."""

import hashlib
import json

import httpx
from test_integration import blank_form, register_profile, synthetic_layout
from test_review import new_case

from ecus_api.core.config import Settings
from ecus_api.db.session import Database
from ecus_api.modules.review.domain import source_fingerprint
from ecus_api.modules.review.policy import FieldRule, ReviewPolicy
from ecus_api.modules.review.schemas import Workspace
from ecus_api.modules.review.template_library import TemplateProfile
from ecus_api.storage.local import LocalBlobStore


def test_empty_description_preserves_existing_review_fingerprints() -> None:
    rule = FieldRule(field="quantity", label="Quantity", value_type="decimal")
    state = Workspace(policy=ReviewPolicy(version="test-v1", name="Synthetic", fields=[rule]))
    legacy = {"documents": [], "sources": [], "rule": rule.model_dump(exclude={"description"})}
    expected = hashlib.sha256(json.dumps(legacy, sort_keys=True).encode()).hexdigest()
    assert source_fingerprint(state, "quantity") == expected
    state.policy.fields[0].description = "Printed line net weight"
    assert source_fingerprint(state, "quantity") != expected


async def test_profile_upgrade_keeps_custom_rules_until_explicit_adoption(
    client: httpx.AsyncClient, database: Database, settings: Settings
) -> None:
    await register_profile(database, settings)
    root = await new_case(client)
    response = await client.post(
        f"{root}/template-profile",
        json={
            "revision": 0,
            "profile_id": "synthetic-form-v1",
            "counts": {"goods": 0},
            "reason": "Initial form",
        },
    )
    assert response.status_code == 200
    state = response.json()["workspace"]
    response = await client.post(
        f"{root}/fields/quantity/canonical",
        json={
            "revision": state["revision"],
            "value": "21",
            "reason": "Reviewed original quantity",
            "reviewed": True,
        },
    )
    assert response.status_code == 200
    state = response.json()["workspace"]
    definition = synthetic_layout().model_dump()
    definition.update(id="synthetic-form-v2", version="synthetic-v2")
    definition["fields"][0]["description"] = "New form convention: printed line net weight"
    key = LocalBlobStore(settings.storage_root).put(blank_form())
    async with database.sessions() as session:
        session.add(
            TemplateProfile(
                id=definition["id"], definition=definition, storage_key=key, enabled=True
            )
        )
        await session.commit()
    for adopt in [False, True]:
        response = await client.post(
            f"{root}/template-profile",
            json={
                "revision": state["revision"],
                "profile_id": definition["id"],
                "counts": {"goods": 0},
                "reason": "Review new form convention",
                "adopt_profile_rules": adopt,
            },
        )
        assert response.status_code == 200
        data = response.json()
        state = data["workspace"]
        field = next(f for f in state["policy"]["fields"] if f["field"] == "quantity")
        comparison = next(c for c in data["readiness"]["comparisons"] if c["field"] == "quantity")
        assert bool(field["description"]) == adopt
        assert comparison["resolved"] is (not adopt)
        assert state["canonical_values"]["quantity"]["value"] == "21"
        assert not data["readiness"]["approved"]
