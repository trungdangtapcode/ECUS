import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import en from "../../apps/web/src/locales/en.json";
import vi from "../../apps/web/src/locales/vi.json";

const fixtures = JSON.parse(
  execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import runpy,base64,json; d=runpy.run_path('services/api/tests/test_review.py'); print(json.dumps({'pdf':base64.b64encode(d['pdf_bytes'](['Invoice','Account (EUR)','Unit Price (EUR/kg) Amount (EUR)','Incoterm: FOB','Total: 12345.67'])).decode(),'template':base64.b64encode(d['template_bytes']()).decode()}))",
    ],
    { encoding: "utf8" },
  ),
) as { pdf: string; template: string };

test("repeated invoice currency survives processing and exports after source review without retyping", async ({
  page,
  request,
}, testInfo) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `CURRENCY-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic repeated currency",
      procedure: profiles[0].code,
    },
  });
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const fields = [
    {
      field: "invoice_incoterm",
      label: "integration.fields.invoice_incoterm",
      normalization: "identifier",
      value_type: "text",
      unit: "",
      required: true,
    },
    {
      field: "invoice_currency",
      label: "integration.fields.invoice_currency",
      normalization: "currency",
      value_type: "text",
      unit: "",
      required: true,
    },
    {
      field: "invoice_total",
      label: "integration.fields.invoice_total",
      value_type: "decimal",
      unit: "EUR",
      required: true,
    },
  ];
  let response = await request.post(`${root}/policy`, {
    data: {
      revision: 0,
      reason: "Configure synthetic currency regression",
      policy: { version: "currency-v1", name: "Currency regression", fields },
    },
  });
  expect(response.ok()).toBeTruthy();
  let state = (await response.json()).workspace;
  response = await request.post(`${root}/template`, {
    data: {
      revision: state.revision,
      filename: "currency.xlsx",
      content_base64: fixtures.template,
      version: "currency-v1",
      mapping_version: "currency-v1",
      mappings: fields.map((field, index) => ({
        field: field.field,
        sheet: "Review",
        cell: ["P53", "Q53", "U53"][index],
        required: true,
      })),
    },
  });
  expect(response.ok()).toBeTruthy();
  state = (await response.json()).workspace;
  response = await request.post(`${root}/documents`, {
    data: { revision: state.revision, filename: "invoice.pdf", content_base64: fixtures.pdf },
  });
  expect(response.ok()).toBeTruthy();
  state = (await response.json()).workspace;
  response = await request.post(`${root}/processing`, { data: { revision: state.revision } });
  expect(response.status()).toBe(202);
  await expect
    .poll(async () => (await (await request.get(`${root}/processing`)).json())[0].status)
    .toBe("succeeded");
  state = (await (await request.get(root)).json()).workspace;
  const currency = state.observations.find(
    (item: { field: string }) => item.field === "invoice_currency",
  );
  expect(currency.normalized).toBe("EUR");
  expect(currency.origin).toBe("ai");
  expect(currency.verified).toBe(false);
  expect(currency.offset).toBe(state.documents[0].pages[0].lastIndexOf("EUR"));
  const originalObservations = state.observations;
  await page.goto(`/cases/${id}/review?section=compare`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  for (const field of fields) {
    await page.getByLabel(en.integration.findField).fill(field.field);
    await page.locator(".harbor-issue-list button").first().click();
    const picker = page.getByRole("region", { name: en.review.quickSourceValue });
    await expect(picker.getByLabel(en.review.sourceCandidateValue)).toContainText(
      field.field === "invoice_currency"
        ? "EUR"
        : field.field === "invoice_incoterm"
          ? "FOB"
          : "12345.67",
    );
    await expect(page.locator(".source-dock .review-pdf")).toHaveAttribute(
      "data-render-status",
      "ready",
    );
    await picker.getByRole("button", { name: en.review.useViewedValue, exact: true }).click();
    await picker.getByLabel(en.processing.confirmEdit, { exact: true }).check();
    await picker.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
    await expect(picker.locator("form")).toHaveCount(0);
  }
  state = (await (await request.get(root)).json()).workspace;
  expect(state.observations).toEqual(originalObservations);
  expect(state.canonical_values.invoice_currency.source_observation_id).toBe(currency.id);
  expect(state.canonical_values.invoice_currency.value).toBe("EUR");
  response = await request.post(`${root}/draft-exports`, {
    data: { revision: state.revision, reason: "Review existing AI source choices" },
  });
  expect(response.ok()).toBeTruthy();
  state = (await response.json()).workspace;
  const record = state.exports.at(-1);
  expect(record.missing_fields).not.toContain("invoice_currency");
  const downloaded = await request.get(`${root}/exports/${record.id}/content`);
  expect(downloaded.ok()).toBeTruthy();
  const file = testInfo.outputPath("reviewed-currency.xlsx");
  writeFileSync(file, await downloaded.body());
  const actual = JSON.parse(
    execFileSync(
      "uv",
      [
        "run",
        "--project",
        "services/api",
        "python",
        "-c",
        "import json,sys;from openpyxl import load_workbook;s=load_workbook(sys.argv[1],data_only=True)['Review'];print(json.dumps([s['P53'].value,s['Q53'].value,s['U53'].value]))",
        file,
      ],
      { encoding: "utf8" },
    ),
  );
  expect(actual).toEqual(["FOB", "EUR", 12345.67]);
  await testInfo.attach("reviewed-currency.xlsx", {
    body: readFileSync(file),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
});
