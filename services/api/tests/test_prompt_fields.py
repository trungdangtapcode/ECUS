"""Prompt descriptions do not change source evidence or stored business rules."""

import json
from pathlib import Path

from ecus_api.modules.review.policy import FieldRule
from ecus_api.modules.review.prompt_fields import load_catalog, requested_fields


def test_registered_form_fields_have_readable_prompt_meaning() -> None:
    catalog = load_catalog(Path("reference-data/ai-field-catalog.v1.json"))
    layout = json.loads(Path("reference-data/excel-layouts/original-form-xls-v6.json").read_text())
    rules = [
        FieldRule.model_validate({key: value for key, value in field.items() if key != "targets"})
        for field in layout["fields"]
    ]
    before = [rule.model_dump(mode="json") for rule in rules]
    definitions = requested_fields(rules, catalog)
    assert all(not field["label"].startswith("integration.fields.") for field in definitions)
    for original, definition in zip(before, definitions, strict=True):
        assert {
            key: value for key, value in definition.items() if key not in {"label", "description"}
        } == {key: value for key, value in original.items() if key not in {"label", "description"}}
    assert [rule.model_dump(mode="json") for rule in rules] == before
    invoice = next(field for field in definitions if field["field"] == "invoice_total")
    assert invoice["label"] == "Invoice total" and "monetary" in invoice["description"]
    bill = next(field for field in definitions if field["field"] == "bill_of_lading")
    assert bill["preferred_sources"] == [] and "never add a date prefix" in bill["description"]


def test_custom_labels_and_unknown_keys_remain_supported() -> None:
    catalog = load_catalog(Path("reference-data/ai-field-catalog.v1.json"))
    fields = requested_fields(
        [
            FieldRule(field="local_value", label="Operator-defined value"),
            FieldRule(field="new_value", label="integration.fields.new_value"),
        ],
        catalog,
    )
    assert fields[0]["label"] == "Operator-defined value"
    assert fields[1]["label"] == "new value"


def test_profile_definition_overrides_generic_catalog_meaning() -> None:
    catalog = load_catalog(Path("reference-data/ai-field-catalog.v1.json"))
    rule = FieldRule(
        field="goods_001_quantity_secondary",
        label="integration.fields.quantity_secondary",
        description="Use the explicitly printed line net weight, never gross weight.",
    )
    definition = requested_fields([rule], catalog)[0]
    assert definition["description"] == rule.description
    assert definition["field"] == rule.field
