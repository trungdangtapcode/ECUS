"""Native XLS export tests use only generated forms and synthetic values."""

import io
import struct
from decimal import Decimal

import httpx
import olefile
import pytest
import xlrd
import xlwt
from test_integration import synthetic_layout
from test_review import new_case, pdf_bytes, upload
from xlwt import CompoundDoc

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.session import Database
from ecus_api.modules.review.native_excel import (
    Record,
    edit_native,
    read_native,
    validate_native_targets,
)
from ecus_api.modules.review.presentation import CellPresentation, apply_presentation
from ecus_api.modules.review.schemas import Mapping
from ecus_api.modules.review.template_library import Layout, TemplateProfile, expand_layout
from ecus_api.storage.local import LocalBlobStore


def native_layout() -> Layout:
    definition = synthetic_layout().model_dump()
    definition.update(id="native-synthetic-v1", file_format="xls", version="native-v1")
    definition["groups"] = []
    return Layout.model_validate(definition)


def native_form(*, formula: bool = False, page_preview: bool = False) -> bytes:
    book = xlwt.Workbook()
    sheet = book.add_sheet("Form")
    sheet.page_preview = page_preview
    sheet.normal_magn = 125
    sheet.preview_magn = 80
    style = xlwt.easyxf(
        "font: name Liberation Serif, bold on; alignment: wrap on, vert centre; "
        "borders: left thin, right double, top thin, bottom thin",
        num_format_str="0.00",
    )
    sheet.write(0, 0, "Original printed heading", style)
    sheet.write(1, 1, 120.25, style)
    sheet.write(2, 1, "Historical identifier", style)
    sheet.write_merge(1, 1, 3, 4, "Historical optional value", style)
    sheet.col(1).width = 7200
    sheet.row(1).height = 480
    sheet.row(1).height_mismatch = True
    sheet.horz_page_breaks = [(3, 0, 255)]
    sheet.paper_size_code = 9
    sheet.portrait = False
    sheet.left_margin = 0.35
    if formula:
        sheet.write(4, 0, xlwt.Formula("B2*2"))
    goods = book.add_sheet("Goods")
    goods.page_preview = page_preview
    goods.visibility = 2
    goods.write(0, 0, "Original goods heading", style)
    goods.write(4, 1, "Hidden historical identifier", style)
    output = io.BytesIO()
    book.save(output)
    return output.getvalue()


@pytest.mark.parametrize("page_preview", [False, True])
def test_native_form_preserves_layout_and_removes_historical_content(page_preview: bool) -> None:
    original = native_form(page_preview=page_preview)
    layout = native_layout()
    blank = edit_native(original, {}, captions=layout.caption_cells)
    assert blank == edit_native(original, {}, captions=layout.caption_cells)
    expanded, mappings, _ = expand_layout(blank, layout, {})
    validate_native_targets(expanded, mappings, 1_000_000)
    # Old shipment strings must also be removed from the underlying shared string table.
    with olefile.OleFileIO(io.BytesIO(blank)) as archive:
        assert archive.listdir() == [["Workbook"]]
        stream = archive.openstream("Workbook").read()
        assert b"Historical" not in stream and b"historical" not in stream
    filled = edit_native(
        blank,
        {
            ("Form", "B2"): Decimal("100.50"),
            ("Form", "B3"): "00123",
            ("Goods", "B5"): "=1+1",
            ("Form", "D2"): None,
        },
        missing={("Form", "D2")},
    )
    source = xlrd.open_workbook(file_contents=original, formatting_info=True)
    output = xlrd.open_workbook(file_contents=filled, formatting_info=True)
    assert source.sheet_names() == output.sheet_names()
    for before, after in zip(source.sheets(), output.sheets(), strict=True):
        assert bool(before.show_in_page_break_preview) == page_preview
        assert not after.show_in_page_break_preview
        assert after.cooked_normal_view_mag_factor == before.cooked_normal_view_mag_factor
        assert before.merged_cells == after.merged_cells
        assert before.visibility == after.visibility
        assert before.horizontal_page_breaks == after.horizontal_page_breaks
        assert {key: vars(value) for key, value in before.rowinfo_map.items()} == {
            key: vars(value) for key, value in after.rowinfo_map.items()
        }
        assert {key: vars(value) for key, value in before.colinfo_map.items()} == {
            key: vars(value) for key, value in after.colinfo_map.items()
        }
        assert before.cell_value(0, 0) == after.cell_value(0, 0)
    sheet = output.sheet_by_name("Form")
    assert sheet.cell_value(1, 1) == 100.5
    assert sheet.cell_value(2, 1) == "00123"
    assert output.sheet_by_name("Goods").cell_value(4, 1) == "=1+1"
    assert output.sheet_by_name("Goods").cell_type(4, 1) == xlrd.XL_CELL_TEXT
    xf_before = source.xf_list[source.sheet_by_name("Form").cell(1, 1).xf_index]
    xf_after = output.xf_list[sheet.cell(1, 1).xf_index]
    assert vars(xf_before) == vars(xf_after)
    for column in [3, 4]:
        cell = sheet.cell(1, column)
        assert cell.value == ""
        xf = output.xf_list[cell.xf_index]
        assert output.colour_map[xf.background.pattern_colour_index] == (242, 204, 204)
        before = source.xf_list[source.sheet_by_name("Form").cell(1, column).xf_index]
        assert vars(xf.border) == vars(before.border)
        assert xf.font_index == before.font_index and xf.format_key == before.format_key


def test_native_form_rejects_unsafe_features_and_unwritable_targets() -> None:
    with pytest.raises(AppError, match="BIFF8"):
        edit_native(native_form(formula=True), {})
    for cells in [["E2"], ["Z500"], ["B2", "B2"]]:
        with pytest.raises(AppError):
            validate_native_targets(
                native_form(),
                [Mapping(field="quantity", sheet="Form", cell=cell) for cell in cells],
                1_000_000,
            )


def test_explicit_presentation_survives_native_export_without_changing_values() -> None:
    settings = {
        "Form": {
            "B2": CellPresentation(
                font_name="Tahoma", font_size=8, wrap=True, horizontal="left", row_height=24
            ),
            "B3": CellPresentation(number_format='@" -"'),
            "A1": CellPresentation(merge_to="C1", wrap=True, row_height=22.5),
        }
    }
    prepared = apply_presentation(native_form(), "xls", settings)
    exported = edit_native(
        prepared, {("Form", "B2"): "A complete readable office name", ("Form", "B3"): "FOB"}
    )
    book = xlrd.open_workbook(file_contents=exported, formatting_info=True)
    sheet = book.sheet_by_name("Form")
    assert sheet.cell_value(1, 1) == "A complete readable office name"
    assert sheet.cell_value(2, 1) == "FOB"
    xf = book.xf_list[sheet.cell(1, 1).xf_index]
    assert book.font_list[xf.font_index].name == "Tahoma"
    assert book.font_list[xf.font_index].height == 160
    assert xf.alignment.text_wrapped and xf.alignment.hor_align == 1
    assert sheet.rowinfo_map[1].height == 480
    assert (0, 1, 0, 3) in sheet.merged_cells
    assert book.format_map[book.xf_list[sheet.cell(2, 1).xf_index].format_key].format_str == '@" -"'
    assert (
        sheet.horizontal_page_breaks
        == xlrd.open_workbook(file_contents=native_form(), formatting_info=True)
        .sheet_by_name("Form")
        .horizontal_page_breaks
    )
    with pytest.raises(ValueError, match="existing"):
        apply_presentation(native_form(), "xls", {"Form": {"A2": CellPresentation(merge_to="C2")}})


def test_unused_continuation_print_area_is_removed_without_removing_its_sheet() -> None:
    native = read_native(native_form())
    names = []
    for index in range(2):
        formula = b"\x3b" + struct.pack("<5H", index, 0, 4, 0, 4)
        header = struct.pack("<HBBHHHBBBB", 0x20, 0, 1, len(formula), 0, index + 1, 0, 0, 0, 0)
        names.append(Record(0x0018, header + b"\x00\x06" + formula))
    extra = [
        Record(0x01AE, struct.pack("<HH", 2, 0x0401)),
        Record(0x0017, struct.pack("<7H", 2, 0, 0, 0, 0, 1, 1)),
        *names,
    ]
    globals_records = [*native.globals[:-1], *extra, native.globals[-1]]
    sheets = [b"".join(record.encode() for record in section) for section in native.sheets]
    position = sum(len(record.encode()) for record in globals_records)
    output = []
    sheet_index = 0
    for record in globals_records:
        if record.code == 0x0085:
            record = Record(record.code, struct.pack("<I", position) + record.data[4:])
            position += len(sheets[sheet_index])
            sheet_index += 1
        output.append(record.encode())
    stream = io.BytesIO()
    CompoundDoc.XlsDoc().save(stream, b"".join([*output, *sheets]))
    original = stream.getvalue()
    assert [(n.name, n.scope) for n in read_native(original).book.name_obj_list] == [
        ("Print_Area", 0),
        ("Print_Area", 1),
    ]
    edited = read_native(edit_native(original, {}, omit_print_areas={"Goods"})).book
    assert [(n.name, n.scope) for n in edited.name_obj_list] == [("Print_Area", 0)]
    assert edited.sheet_names() == ["Form", "Goods"]
    assert edited.sheet_by_name("Goods").cell_value(4, 1) == "Hidden historical identifier"


def test_native_layout_protects_captions_and_supports_asymmetric_slots() -> None:
    layout = native_layout()
    values = layout.model_dump()
    values["fields"][0]["targets"] = [{"sheet": "Form", "cell": "A1"}]
    with pytest.raises(AppError, match="captions"):
        expand_layout(native_form(), Layout.model_validate(values), {})
    values = layout.model_dump()
    values["groups"] = synthetic_layout().model_dump()["groups"]
    values["groups"][0]["repeat_sheet"] = None
    values["groups"][0]["repeat_offsets"] = []
    values["groups"][0]["maximum"] = 2
    values["groups"][0]["slots"] = [
        {"sheet": "Goods"},
        {
            "sheet": "Goods",
            "row_offset": 24,
            "field_targets": {"description": [{"sheet": "Form", "cell": "B3"}]},
        },
    ]
    _, mappings, _ = expand_layout(native_form(), Layout.model_validate(values), {"goods": 2})
    target = next(item for item in mappings if item.field == "goods_002_description")
    assert (target.sheet, target.cell) == ("Form", "B3")
    values["groups"][0]["slots"][1]["field_targets"] = {"unknown": []}
    with pytest.raises(ValueError, match="overrides"):
        Layout.model_validate(values)


async def test_native_profile_export_and_profile_switch_retains_optional_review(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
) -> None:
    layout = native_layout()
    blank = edit_native(native_form(), {}, captions=layout.caption_cells)
    key = LocalBlobStore(settings.storage_root).put(blank)
    async with database.sessions() as session:
        session.add(
            TemplateProfile(
                id=layout.id,
                definition=layout.model_dump(mode="json"),
                storage_key=key,
                enabled=True,
            )
        )
        await session.commit()
    root = await new_case(client)
    revision = 0

    async def post(path: str, data: dict) -> dict:
        nonlocal revision
        response = await client.post(root + path, json={"revision": revision, **data})
        assert response.status_code == 200, response.text
        value = response.json()
        revision = value["workspace"]["revision"]
        return value

    value = await post("/template-profile", {"profile_id": layout.id, "reason": "Selected form"})
    policy = value["workspace"]["policy"]
    policy["version"] = "optional-review-v1"
    policy["fields"].append({"field": "voyage", "label": "Voyage", "required": False})
    await post("/policy", {"policy": policy, "reason": "Retain optional transport review"})
    value = await post("/documents", upload(pdf_bytes(["LEG-2"]), "transport.pdf", revision))
    await post(
        "/observations",
        {
            "field": "voyage",
            "document_id": value["workspace"]["documents"][-1]["id"],
            "document_type": "BILL_OF_LADING",
            "page": 1,
            "quote": "LEG-2",
            "verified": True,
        },
    )
    for field, value in [("quantity", "100.50"), ("identifier", "00123")]:
        await post(
            f"/fields/{field}/canonical",
            {"value": value, "reason": "Checked output", "reviewed": True},
        )
    value = await post("/template-profile", {"profile_id": layout.id, "reason": "Confirm form"})
    assert any(
        item["field"] == "voyage" and item["quote"] == "LEG-2"
        for item in value["workspace"]["observations"]
    )
    assert "voyage" in {field["field"] for field in value["workspace"]["policy"]["fields"]}
    assert value["readiness"]["eligible"], value["readiness"]["blockers"]
    assert (await client.post(root + "/exports", json={"revision": revision})).status_code == 409
    await post("/approve", {"reason": "Reviewed missing optional values"})
    value = await post("/exports", {})
    record = value["workspace"]["exports"][-1]
    assert record["filename"].endswith(".xls")
    download = await client.get(root + f"/exports/{record['id']}/content")
    assert download.headers["content-type"] == "application/vnd.ms-excel"
    sheet = xlrd.open_workbook(file_contents=download.content, formatting_info=True).sheet_by_name(
        "Form"
    )
    assert sheet.cell_value(0, 0) == "Original printed heading"
    assert sheet.cell_value(1, 1) == 100.5 and sheet.cell_value(2, 1) == "00123"
    assert record["missing_fields"] == ["missing"]


async def test_native_export_requires_full_identifier_from_preferred_declaration_source(
    client: httpx.AsyncClient,
    database: Database,
    settings: Settings,
) -> None:
    definition = native_layout().model_dump()
    definition["id"] = "native-declaration-identifier-v1"
    field = next(item for item in definition["fields"] if item["field"] == "identifier")
    field["preferred_sources"] = ["CUSTOMS_DECLARATION"]
    field["normalization"] = "identifier"
    layout = Layout.model_validate(definition)
    blank = edit_native(native_form(), {}, captions=layout.caption_cells)
    key = LocalBlobStore(settings.storage_root).put(blank)
    async with database.sessions() as session:
        session.add(
            TemplateProfile(
                id=layout.id,
                definition=layout.model_dump(mode="json"),
                storage_key=key,
                enabled=True,
            )
        )
        await session.commit()
    root = await new_case(client)
    revision = 0

    async def post(path: str, data: dict) -> dict:
        nonlocal revision
        response = await client.post(root + path, json={"revision": revision, **data})
        assert response.status_code == 200, response.text
        result = response.json()
        revision = result["workspace"]["revision"]
        return result

    await post("/template-profile", {"profile_id": layout.id, "reason": "Selected source policy"})
    observations = []
    for kind, quote in [("B/L", "CARRIER-042"), ("CUSTOMS_DECLARATION", "150830CARRIER-042")]:
        result = await post("/documents", upload(pdf_bytes([quote]), f"{kind}.pdf", revision))
        document = result["workspace"]["documents"][-1]
        await post(
            "/logical-documents",
            {
                "document_id": document["id"],
                "document_type": kind,
                "page_from": 1,
                "page_to": 1,
                "reason": "Checked synthetic source type",
            },
        )
        result = await post(
            "/observations",
            {
                "field": "identifier",
                "document_id": document["id"],
                "document_type": kind,
                "page": 1,
                "quote": quote,
                "verified": True,
            },
        )
        observations.append(result["workspace"]["observations"][-1]["id"])
    result = await post(
        "/fields/identifier/selection",
        {"observation_id": observations[0], "reason": "Select bare carrier number"},
    )
    assert "identifier:source_exception_requires_review" in result["readiness"]["blockers"]
    for path in ["/approve", "/exports"]:
        body = {"revision": revision}
        if path == "/approve":
            body["reason"] = "Attempt unreviewed source exception"
        response = await client.post(
            root + path,
            json=body,
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "export_not_ready"
    result = await post(
        "/fields/identifier/selection",
        {"observation_id": observations[1], "reason": "Use full printed declaration identifier"},
    )
    assert result["readiness"]["eligible"]
    await post("/approve", {"reason": "Reviewed full declaration value"})
    result = await post("/exports", {})
    export = result["workspace"]["exports"][-1]
    download = await client.get(root + f"/exports/{export['id']}/content")
    assert download.status_code == 200
    book = xlrd.open_workbook(file_contents=download.content)
    assert book.sheet_by_name("Form").cell_value(2, 1) == "150830CARRIER-042"
    assert book.sheet_by_name("Goods").cell_value(4, 1) == "150830CARRIER-042"
