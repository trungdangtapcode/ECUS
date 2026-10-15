import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import en from "../../apps/web/src/locales/en.json";
import vi from "../../apps/web/src/locales/vi.json";

// Synthetic documents are generated in memory; no customer files or paid AI are used.
const fixtures = JSON.parse(
  execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import runpy,base64,json,sys; sys.path.insert(0,'services/api/tests'); from test_native_excel import native_form,native_layout; from ecus_api.modules.review.native_excel import edit_native; d=runpy.run_path('services/api/tests/test_review.py'); print(json.dumps({'pdf':base64.b64encode(d['pdf_bytes'](['Invoice','21,000'])).decode(),'xlsx':base64.b64encode(d['template_bytes']()).decode(),'xls':base64.b64encode(edit_native(native_form(),{},captions=native_layout().caption_cells)).decode(),'pdf_new':base64.b64encode(d['pdf_bytes'](['Invoice','22,000'])).decode(),'bill':base64.b64encode(d['pdf_bytes'](['BILL OF LADING','SYNBL001'])).decode(),'arrival':base64.b64encode(d['pdf_bytes'](['ARRIVAL NOTICE','SYNBL002'])).decode()}))",
    ],
    { encoding: "utf8" },
  ),
) as { pdf: string; xlsx: string; xls: string; pdf_new: string; bill: string; arrival: string };

test("Consolidation keeps a correction draft when paging and searching a large form", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `PAGING-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic large form review",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const record = await created.json();
  const root = `/api/v1/cases/${record.id}/review`;
  const initial = (await (await request.get(root)).json()).workspace;
  const policy = await request.post(`${root}/policy`, {
    data: {
      revision: initial.revision,
      reason: "Configure a synthetic large form",
      policy: {
        version: "paging-test-v1",
        name: "Synthetic field review",
        status: "project_baseline",
        fields: [
          ...Array.from({ length: 26 }, (_, index) => ({
            field: `field_${String(index).padStart(2, "0")}`,
            label: `Synthetic field ${index}`,
            required: false,
          })),
          {
            field: "quantity",
            label: "Quantity",
            value_type: "decimal",
            unit: "KG",
            required: false,
          },
        ],
      },
    },
  });
  expect(policy.ok()).toBeTruthy();
  const configured = (await policy.json()).workspace;
  const template = await request.post(`${root}/template`, {
    data: {
      revision: configured.revision,
      filename: "synthetic-layout.xlsx",
      content_base64: fixtures.xlsx,
      version: "paging-v1",
      mapping_version: "paging-mapping-v1",
      mappings: [
        ...Array.from({ length: 26 }, (_, index) => ({
          field: `field_${String(index).padStart(2, "0")}`,
          sheet: "Review",
          cell: `C${index + 4}`,
          required: false,
        })),
        { field: "field_00", sheet: "Review", cell: "D4", required: false },
        { field: "quantity", sheet: "Review", cell: "B2", required: false },
      ],
    },
  });
  expect(template.ok()).toBeTruthy();
  await page.goto(`/cases/${record.id}/review?section=canonical`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  const pager = page.getByRole("navigation", { name: en.integration.fieldPages });
  const quantity = page.locator('[data-field="quantity"]');
  await expect(quantity).not.toBeVisible();
  await pager.getByRole("button", { name: en.common.next, exact: true }).click();
  await quantity.getByRole("button", { name: en.integration.editValue, exact: true }).click();
  await quantity.getByLabel(en.integration.value, { exact: true }).fill("21000");
  await quantity.getByLabel(en.integration.editReason).fill("Checked the source before correction");
  await quantity.getByLabel(en.processing.confirmEdit).check();
  await pager.getByRole("button", { name: en.common.previous, exact: true }).click();
  await expect(quantity).not.toBeVisible();
  await page.getByRole("searchbox", { name: en.integration.findField }).fill("quantity");
  await expect(quantity.getByLabel(en.integration.value, { exact: true })).toHaveValue("21000");
  await quantity.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  await expect(quantity.locator("input[readonly]")).toHaveValue("21000 KG");
  await page.reload();
  await page.getByRole("searchbox", { name: en.integration.findField }).fill("quantity");
  await expect(quantity.locator("input[readonly]")).toHaveValue("21000 KG");
  await expect(page.locator(".source-dock canvas")).toHaveCount(0);
  expect(
    (await (await request.get(root)).json()).workspace.canonical_values.quantity.reviewed,
  ).toBe(true);
  await page.goto(`/cases/${record.id}/review?section=export`);
  const coverage = page.getByRole("region", { name: en.integration.exportCoverage });
  await expect(coverage).toContainText(
    en.integration.coverageSummary.replace("{{cells}}", "28").replace("{{fields}}", "27"),
  );
  await expect(coverage.locator("dd")).toHaveText(["1", "0", "27"]);
  await expect(coverage).toContainText(
    en.integration.missingCount_other.replace("{{count}}", "26"),
  );
  await expect(coverage).toContainText(en.integration.blankReasonNotice);
  await coverage.getByText(en.integration.showMissing, { exact: true }).click();
  await expect(coverage.locator("li").first()).toContainText("Review!C4 · Review!D4");
  await coverage.getByRole("button", { name: en.integration.coverageCheck }).click();
  await expect(page.getByRole("searchbox", { name: en.integration.findField })).toBeVisible();
});

for (const format of ["xlsx", "xls"] as const) {
  const design = "harbor";
  const targetSheet = format === "xls" ? "Form" : "Review";
  test(`${design}: actual PDF review, server approval and ${format.toUpperCase()} download`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const profiles = (await (await request.get("/api/v1/reference/profiles")).json()) as {
      code: string;
    }[];
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `REVIEW-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic document review",
        procedure: profiles[0]!.code,
      },
    });
    expect(created.ok()).toBeTruthy();
    const item = (await created.json()) as { id: string };
    const root = `/api/v1/cases/${item.id}/review`;
    await page.goto(`/cases/${item.id}/review?design=${design}`);
    await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
    await page.getByLabel(en.review.upload).setInputFiles({
      name: "source.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(fixtures.pdf, "base64"),
    });
    await expect(page.locator(".review-source-text")).toContainText("21,000");
    await page.getByText(en.processing.manualTools, { exact: true }).click();
    await page.getByRole("textbox", { name: en.review.field, exact: true }).fill("quantity");
    await page.getByLabel(en.review.logicalType).fill("INVOICE");
    await page.getByRole("textbox", { name: en.review.quote, exact: true }).fill("21,000");
    await page.getByRole("combobox", { name: en.review.type, exact: true }).selectOption("decimal");
    await page.getByRole("textbox", { name: en.review.unit, exact: true }).fill("KG");
    await page.getByLabel(en.review.verified).check();
    await page.getByRole("button", { name: en.review.record, exact: true }).click();
    await expect(page.locator(".review-revision")).toContainText("2");
    await page.getByRole("button", { name: en.review.compare, exact: true }).click();
    await expect(page.locator(".review-status")).toHaveText(en.workbench.statuses.NOT_COMPARABLE);
    await page
      .getByLabel(en.review.reason)
      .fill("Checked the original document and selected this source.");
    await page.getByRole("button", { name: en.review.select, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.review.selection, exact: true }),
    ).toBeDisabled();
    const beforePolicy = (await (await request.get(root)).json()).workspace;
    const policyResult = await request.post(`${root}/policy`, {
      data: {
        revision: beforePolicy.revision,
        reason: "Synthetic test policy",
        policy: {
          version: "test-v1",
          name: "Test rules",
          status: "project_baseline",
          fields: [{ field: "quantity", label: "Quantity", value_type: "decimal", unit: "KG" }],
        },
      },
    });
    expect(policyResult.ok()).toBeTruthy();
    const withPolicy = (await policyResult.json()).workspace;
    expect(
      (
        await request.post(`${root}/logical-documents`, {
          data: {
            revision: withPolicy.revision,
            reason: "Read source",
            document_id: withPolicy.documents[0].id,
            document_type: "INVOICE",
            page_from: 1,
            page_to: 1,
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.reload();
    await page.getByRole("button", { name: en.review.export, exact: true }).click();
    await expect(page.getByRole("button", { name: en.review.exportNow })).toBeDisabled();
    await page.getByLabel(en.review.templateFile).setInputFiles({
      name: `template.${format}`,
      mimeType:
        format === "xls"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(fixtures[format], "base64"),
    });
    await page.getByRole("textbox", { name: en.review.templateVersion, exact: true }).fill("v1");
    await page.getByRole("textbox", { name: en.review.mappingVersion, exact: true }).fill("m1");
    await page.getByRole("textbox", { name: en.review.field, exact: true }).fill("quantity");
    await page.getByRole("textbox", { name: en.review.sheet, exact: true }).fill(targetSheet);
    await page.getByRole("textbox", { name: en.review.cell, exact: true }).fill("B2");
    await page.getByRole("button", { name: en.review.saveTemplate }).click();
    await expect(page.locator(".review-template-summary")).toContainText(
      `Quantity → ${targetSheet}!B2`,
    );
    await expect(page.getByRole("button", { name: en.review.exportNow })).toBeDisabled();
    await page.getByLabel(en.review.reason).fill("Checked current revision and policy");
    await page.getByRole("button", { name: en.review.approve, exact: true }).click();
    await expect(page.getByRole("button", { name: en.review.exportNow })).toBeEnabled();
    await page.getByRole("button", { name: en.review.exportNow }).click();
    const link = page.getByRole("link", { name: new RegExp(en.review.download) });
    await expect(link).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await link.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    if (format === "xls") {
      const downloadedPath = await download.path();
      const value = execFileSync(
        "uv",
        [
          "run",
          "--project",
          "services/api",
          "python",
          "-c",
          "import sys,xlrd; b=xlrd.open_workbook(sys.argv[1]); print(b.sheet_by_name('Form').cell_value(1,1))",
          downloadedPath!,
        ],
        { encoding: "utf8" },
      );
      expect(Number(value.trim())).toBe(21000);
    }
    await page.reload();
    await page.getByRole("button", { name: en.review.canonical, exact: true }).click();
    await expect(page.locator(".canonical-entry input")).toHaveValue("21000 KG");
    await page.getByRole("button", { name: /INVOICE/ }).click();
    await expect(page.locator(".review-source-text mark")).toHaveText("21,000");
    await expect(page.getByRole("link", { name: en.review.openOriginal })).toHaveAttribute(
      "href",
      /#page=1$/,
    );
    await expect(page.locator(".review-pdf canvas")).toBeVisible();
    await expect(page.locator(".review-pdf")).toContainText(en.workbench.matches);
    await page.getByRole("button", { name: en.review.audit, exact: true }).click();
    await expect(page.locator(".review-audit")).toContainText(en.review.events.excel_exported);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const tab of [
      en.review.documents,
      en.review.compare,
      en.review.canonical,
      en.review.export,
      en.review.audit,
    ]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    const state = (await (await request.get(root)).json()) as { workspace: { revision: number } };
    const stale = await request.post(`${root}/exports`, {
      data: { revision: state.workspace.revision - 1 },
    });
    expect(stale.status()).toBe(409);
    expect(errors).toEqual([]);
  });
}

test("versioned rules, combined documents, applicability and corrections use the live backend", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `RULE-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic rules review",
      procedure: profiles[0].code,
    },
  });
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const uploaded = await request.post(`${root}/documents`, {
    data: { revision: 0, filename: "combined.pdf", content_base64: fixtures.pdf },
  });
  const documentId = (await uploaded.json()).workspace.documents[0].id;
  await page.goto(`/cases/${id}/review?design=control&section=rules`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  await page.getByLabel(en.review.reason).fill("Reviewed synthetic configuration");
  await page.getByLabel(en.rules.file).setInputFiles({
    name: "rules.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: "test-v1",
        name: "Synthetic rules",
        status: "project_baseline",
        fields: [{ field: "quantity", label: "Quantity", value_type: "decimal", unit: "KG" }],
        document_requirements: [
          { key: "invoice", label: "Invoice", any_of: ["INVOICE"], when: "always" },
          { key: "origin", label: "Origin", any_of: ["CO"], when: "applicable" },
          {
            key: "arrival",
            label: "Arrival",
            any_of: ["ARRIVAL_NOTICE"],
            when: "arrival_confirmed",
          },
        ],
      }),
    ),
  });
  await page.getByRole("button", { name: en.rules.adopt }).click();
  await expect(page.getByRole("heading", { name: "Synthetic rules · test-v1" })).toBeVisible();
  await page
    .getByRole("combobox", { name: `${en.rules.applicability} Origin` })
    .selectOption("not_applicable");
  await expect
    .poll(
      async () => (await (await request.get(root)).json()).workspace.applicability.origin?.status,
    )
    .toBe("not_applicable");
  await page.getByLabel(en.review.logicalType).fill("INVOICE");
  await page.getByRole("button", { name: en.rules.classify }).click();
  await expect
    .poll(async () => (await (await request.get(root)).json()).workspace.logical_documents.length)
    .toBe(1);
  await page.getByLabel(en.rules.stage).selectOption("arrival_confirmed");
  await expect
    .poll(async () => (await (await request.get(root)).json()).readiness.blockers)
    .toContain("arrival:logical_document_missing");
  await page.getByRole("button", { name: en.review.documents, exact: true }).click();
  await page.getByText(en.processing.manualTools, { exact: true }).click();
  await page.getByRole("textbox", { name: en.review.field, exact: true }).fill("quantity");
  await page.getByLabel(en.review.logicalType).fill("INVOICE");
  await page.getByRole("textbox", { name: en.review.quote, exact: true }).fill("21,000");
  await page.getByRole("combobox", { name: en.review.type, exact: true }).selectOption("decimal");
  await page.getByRole("textbox", { name: en.review.unit, exact: true }).fill("KG");
  await page.getByLabel(en.review.verified).check();
  await page.getByRole("button", { name: en.review.record, exact: true }).click();
  await expect
    .poll(async () => (await (await request.get(root)).json()).workspace.observations.length)
    .toBe(1);
  await page.getByRole("button", { name: en.review.compare, exact: true }).click();
  await page.getByRole("button", { name: en.rules.correct, exact: true }).click();
  await expect(page.getByLabel(en.review.verified)).toBeDisabled();
  await page.getByLabel(en.review.reason).fill("Verified the original unit");
  await page.getByRole("button", { name: en.rules.saveCorrection }).click();
  await expect
    .poll(async () => (await (await request.get(root)).json()).workspace.observations.length)
    .toBe(2);
  const result = await (await request.get(root)).json();
  expect(result.workspace.observations[0].state).toBe("superseded");
  expect(result.workspace.observations[1].verified).toBe(false);
  await page.getByRole("button", { name: en.review.audit, exact: true }).click();
  await expect(page.getByText(en.rules.superseded, { exact: false })).toBeVisible();
  expect((await request.get(`${root}/documents/${documentId}/content`)).ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: en.review.rules, exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

for (const format of ["xlsx", "xls"] as const) {
  test(`Harbor: ${format.toUpperCase()} library form, browser correction and missing red cells`, async ({
    page,
    request,
  }) => {
    const profiles = (await (await request.get("/api/v1/reference/profiles")).json()) as {
      code: string;
    }[];
    const templates = (await (await request.get("/api/v1/reference/excel-templates")).json()) as {
      id: string;
      name_key: string;
      groups: Record<string, number>;
    }[];
    const template = templates.find(
      (item) =>
        item.groups.containers &&
        (format === "xls" ? item.groups.goods === 3 : item.groups.goods > 3),
    );
    test.skip(
      !template,
      "Explicitly import the sanitized export layout into the isolated test stack first.",
    );
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `FLOW-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic integrated preparation",
        procedure: profiles[0]!.code,
      },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: string };
    const root = `/api/v1/cases/${id}/review`;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/cases/${id}/review`);
    const language = page.getByRole("combobox", { name: en.app.language });
    if (await language.count()) await language.selectOption("en");
    else await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
    await page.getByLabel(en.integration.profile).selectOption(template!.id);
    await page
      .getByLabel(en.integration.groups.goods, { exact: true })
      .fill(format === "xls" ? "3" : "4");
    await page.getByLabel(en.integration.groups.containers, { exact: true }).fill("0");
    await page
      .getByLabel(en.integration.setupReason)
      .fill("Use blank form for synthetic test shipment");
    await page.getByRole("button", { name: en.integration.applyProfile, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.integration.updateProfile, exact: true }),
    ).toBeVisible();
    await page.getByLabel(en.review.upload).setInputFiles({
      name: "source.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(fixtures.pdf, "base64"),
    });
    await expect(page.locator(".review-source-text")).toContainText("21,000");
    await page.getByText(en.processing.manualTools, { exact: true }).click();
    await page
      .getByRole("combobox", { name: en.review.field, exact: true })
      .selectOption("invoice_total");
    await page.getByLabel(en.review.logicalType).fill("INVOICE");
    await page.getByRole("textbox", { name: en.review.quote, exact: true }).fill("21,000");
    await page.getByLabel(en.review.verified).check();
    await page.getByRole("button", { name: en.review.record, exact: true }).click();
    await expect(page.locator(".review-revision")).toContainText("3");
    await page.getByRole("button", { name: en.review.canonical, exact: true }).click();
    await page.getByRole("searchbox", { name: en.integration.findField }).fill("invoice_total");
    const invoice = page.locator('[data-field="invoice_total"]');
    await invoice.getByRole("button", { name: en.integration.editValue, exact: true }).click();
    await invoice.getByLabel(en.integration.value, { exact: true }).fill("21000.50");
    await invoice
      .getByLabel(en.integration.editReason)
      .fill("Corrected after checking invoice detail");
    await invoice.getByLabel(en.processing.confirmEdit).check();
    await invoice.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
    await expect(invoice.locator("input[readonly]")).toHaveValue("21000.50");
    await expect(invoice).toContainText(en.integration.manualValue);
    await page.reload();
    await expect(page.locator('[data-field="invoice_total"] input[readonly]')).toHaveValue(
      "21000.50",
    );
    await page.getByRole("button", { name: en.review.export, exact: true }).click();
    await expect(page.locator(".review-missing-warning")).toBeVisible();
    await expect(
      page.getByRole("button", { name: en.review.exportNow, exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel(en.review.reason)
      .fill("Reviewed form and accepted missing fields marked red");
    await page.getByRole("button", { name: en.review.approve, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.review.exportNow, exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: en.review.exportNow, exact: true }).click();
    const link = page.getByRole("link", { name: new RegExp(en.review.download) });
    await expect(link).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await link.click();
    const file = await downloaded;
    const path = await file.path();
    expect(path).toBeTruthy();
    const values = JSON.parse(
      execFileSync(
        "uv",
        [
          "run",
          "--project",
          "services/api",
          "python",
          "-c",
          format === "xls"
            ? "import sys,json,xlrd; b=xlrd.open_workbook(sys.argv[1],formatting_info=True); s=b.sheet_by_name('TKX'); c=s.cell(53,20); print(json.dumps({'value':s.cell_value(52,20),'missing':s.cell_value(53,20) or None,'red':'FFF2CCCC' if b.colour_map[b.xf_list[c.xf_index].background.pattern_colour_index]==(242,204,204) else None,'sheets':b.sheet_names(),'old_exporter':s.cell_value(13,5) or None}))"
            : "import sys,json; from openpyxl import load_workbook; b=load_workbook(open(sys.argv[1],'rb')); print(json.dumps({'value':b['TKX']['U53'].value,'missing':b['TKX']['U54'].value,'red':b['TKX']['U54'].fill.fgColor.rgb,'sheets':b.sheetnames,'old_exporter':b['TKX']['F14'].value}))",
          path!,
        ],
        { encoding: "utf8" },
      ),
    ) as { value: number; missing: null; red: string; sheets: string[]; old_exporter: null };
    expect(values).toEqual({
      value: 21000.5,
      missing: null,
      red: "FFF2CCCC",
      sheets: format === "xls" ? ["TKX", "HANG"] : ["TKX", "HANG", "HANG_02"],
      old_exporter: null,
    });
    await page.getByRole("button", { name: en.review.documents, exact: true }).click();
    const current = (await (await request.get(root)).json()).workspace as { revision: number };
    const changed = await request.post(`${root}/documents`, {
      data: {
        revision: current.revision,
        filename: "new-source.pdf",
        content_base64: Buffer.from(fixtures.pdf, "base64").toString("base64"),
      },
    });
    expect(changed.status()).toBe(409); // Identical original PDF cannot be uploaded twice.
    await page.getByLabel(en.review.upload).setInputFiles({
      name: "changed-source.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(fixtures.pdf_new, "base64"),
    });
    await expect(page.locator(".document-list")).toContainText("changed-source.pdf");
    await page.getByRole("button", { name: en.review.export, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.review.exportNow, exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".review-export-gate")).toContainText(
      en.review.blockers.canonical_edit_stale,
    );
    await page.getByRole("button", { name: en.review.canonical, exact: true }).click();
    await expect(page.locator('[data-field="invoice_total"]')).toContainText(
      en.integration.staleEdit,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test("Harbor: inconsistent amount blocks native export until a browser correction", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `CALC-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic arithmetic review",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  let revision = 0;
  let current: any;
  const post = async (path: string, data: Record<string, unknown>) => {
    const result = await request.post(root + path, { data: { revision, ...data } });
    expect(result.ok()).toBeTruthy();
    current = await result.json();
    revision = current.workspace.revision;
  };
  await post("/policy", {
    reason: "Synthetic arithmetic",
    policy: {
      version: "browser-arithmetic-v1",
      name: "Synthetic arithmetic",
      status: "project_baseline",
      fields: ["quantity", "price", "amount"].map((field) => ({
        field,
        label: field,
        value_type: "decimal",
      })),
      arithmetic_checks: [
        {
          key: "line_amount",
          label: "integration.arithmetic.goodsAmount",
          factors: ["quantity", "price"],
          result_field: "amount",
        },
      ],
    },
  });
  await post("/template", {
    filename: "synthetic.xls",
    content_base64: fixtures.xls,
    version: "v1",
    mapping_version: "v1",
    mappings: [
      { field: "quantity", sheet: "Form", cell: "B2" },
      { field: "price", sheet: "Form", cell: "B3" },
      { field: "amount", sheet: "Form", cell: "D2" },
    ],
  });
  await post("/documents", { filename: "source.pdf", content_base64: fixtures.pdf });
  const documentId = current.workspace.documents[0].id;
  await post("/logical-documents", {
    document_id: documentId,
    document_type: "INVOICE",
    page_from: 1,
    page_to: 1,
    reason: "Verified synthetic source",
  });
  for (const [field, value] of [
    ["quantity", "100"],
    ["price", "2"],
    ["amount", "199"],
  ]) {
    await post(`/fields/${field}/canonical`, {
      value,
      reviewed: true,
      reason: "Verified synthetic test value",
    });
  }
  expect(current.readiness.blockers).toContain("amount:arithmetic_mismatch");
  expect((await request.post(root + "/exports", { data: { revision } })).status()).toBe(409);
  await page.goto(`/cases/${id}/review?section=compare`);
  const language = page.getByRole("combobox", { name: en.app.language });
  if (await language.count()) await language.selectOption("en");
  else await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  await page.locator(".harbor-issue-list button").filter({ hasText: "amount" }).click();
  await expect(page.locator(".review-arithmetic-error")).toContainText("100 × 2 = 200.00");
  await expect(page.locator(".review-arithmetic-error")).toContainText("Difference: -1.00");
  const entry = page.locator('[data-field="amount"]');
  await entry.getByRole("button", { name: en.integration.editAgain, exact: true }).click();
  await entry.getByLabel(en.integration.value, { exact: true }).fill("200");
  await entry
    .getByLabel(en.integration.editReason)
    .fill("Corrected after rechecking quantity and price");
  await entry.getByLabel(en.processing.confirmEdit).check();
  await entry.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  await expect(page.locator(".review-arithmetic-error")).toHaveCount(0);
  await expect(page.locator(".review-arithmetic-check")).toContainText("Difference: 0.00");
  await page.getByRole("button", { name: en.review.export, exact: true }).click();
  await page.getByLabel(en.review.reason).fill("Reviewed corrected arithmetic");
  await page.getByRole("button", { name: en.review.approve, exact: true }).click();
  await expect(page.getByRole("button", { name: en.review.exportNow, exact: true })).toBeEnabled();
  await page.getByRole("button", { name: en.review.exportNow, exact: true }).click();
  await expect(page.getByRole("link", { name: new RegExp(en.review.download) })).toBeVisible();
  const final = await (await request.get(root)).json();
  expect(final.workspace.exports[0].values_snapshot.amount).toBe("200");
  expect(final.workspace.exports[0].filename).toMatch(/\.xls$/);
});

test("Harbor: reviewed B/L selection exports without the held-out declaration", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const templates = await (await request.get("/api/v1/reference/excel-templates")).json();
  const template = templates.find((item: { id: string }) => item.id === "original-form-xls-v6");
  expect(template, "Explicitly import the current sanitized native form first.").toBeTruthy();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `BILL-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic supporting-document review",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  let revision = 0;
  let current: any;
  const post = async (path: string, data: Record<string, unknown>) => {
    const result = await request.post(root + path, { data: { revision, ...data } });
    expect(result.ok()).toBeTruthy();
    current = await result.json();
    revision = current.workspace.revision;
  };
  await post("/template-profile", {
    profile_id: template.id,
    counts: { goods: 0, containers: 0 },
    reason: "Use supporting documents without an ECUS answer",
  });
  expect(
    current.workspace.policy.fields.find(
      (item: { field: string }) => item.field === "bill_of_lading",
    ).preferred_sources,
  ).toEqual([]);
  for (const [filename, content, kind, quote] of [
    ["bill.pdf", fixtures.bill, "B/L", "SYNBL001"],
    ["arrival.pdf", fixtures.arrival, "AN", "SYNBL002"],
  ]) {
    await post("/documents", { filename, content_base64: content });
    const document = current.workspace.documents.at(-1);
    await post("/logical-documents", {
      document_id: document.id,
      document_type: kind,
      page_from: 1,
      page_to: 1,
      reason: "Verified synthetic document type",
    });
    await post("/observations", {
      document_id: document.id,
      document_type: kind,
      field: "bill_of_lading",
      page: 1,
      quote,
      value_type: "text",
      verified: false,
    });
  }
  expect(current.readiness.blockers).toContain("bill_of_lading:EXTRACTION_UNCERTAIN");
  expect((await request.post(root + "/exports", { data: { revision } })).status()).toBe(409);
  for (const source of current.workspace.observations) {
    await post(`/observations/${source.id}/verify`, {
      reason: "Checked the original synthetic PDF",
    });
  }
  expect(current.readiness.blockers).toContain("bill_of_lading:selection_required");
  expect((await request.post(root + "/exports", { data: { revision } })).status()).toBe(409);

  await page.goto(`/cases/${id}/review?section=compare`);
  const language = page.getByRole("combobox", { name: en.app.language });
  if (await language.count()) await language.selectOption("en");
  else await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  await page
    .locator(".harbor-issue-list button")
    .filter({ hasText: en.integration.fields.declaration_bill_of_lading })
    .click();
  await page.getByLabel(en.review.reason).fill("Selected the reviewed B/L for this shipment");
  const row = page.locator(".comparison-values tbody tr").filter({ hasText: "bill.pdf" });
  await row.getByRole("button", { name: en.review.select, exact: true }).click();
  await expect(row.getByRole("button", { name: en.review.selection, exact: true })).toBeDisabled();
  const selected = await (await request.get(root)).json();
  expect(selected.readiness.eligible).toBe(true);
  expect(selected.readiness.blockers).not.toContain(
    "bill_of_lading:source_exception_requires_review",
  );
  expect(selected.workspace.canonical_values).toEqual({});
  expect(selected.workspace.documents).toHaveLength(2);
  expect(
    selected.workspace.logical_documents.map(
      (item: { document_type: string }) => item.document_type,
    ),
  ).not.toContain("CUSTOMS_DECLARATION");

  await page.getByRole("button", { name: en.review.export, exact: true }).click();
  await expect(page.getByRole("button", { name: en.review.exportNow, exact: true })).toBeDisabled();
  await page.getByLabel(en.review.reason).fill("Reviewed supporting sources and blank red fields");
  await page.getByRole("button", { name: en.review.approve, exact: true }).click();
  await page.getByRole("button", { name: en.review.exportNow, exact: true }).click();
  const link = page.getByRole("link", { name: new RegExp(en.review.download) });
  await expect(link).toBeVisible();
  const downloading = page.waitForEvent("download");
  await link.click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/\.xls$/);
  const output = execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import sys,xlrd; b=xlrd.open_workbook(sys.argv[1]); print(b.sheet_by_name('TKX').cell_value(38,7))",
      (await file.path())!,
    ],
    { encoding: "utf8" },
  );
  expect(output.trim()).toBe("SYNBL001");
});

for (const format of ["xls", "xlsx"] as const) {
  test(`Harbor: ${format} review draft downloads while approval stays blocked`, async ({
    page,
    request,
  }) => {
    const profiles = await (await request.get("/api/v1/reference/profiles")).json();
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `DRAFT-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic client draft review",
        procedure: profiles[0].code,
      },
    });
    expect(created.status()).toBe(201);
    const caseRecord = await created.json();
    const root = `/api/v1/cases/${caseRecord.id}/review`;
    let state = (await (await request.get(root)).json()).workspace;
    const policy = await request.post(`${root}/policy`, {
      data: {
        revision: state.revision,
        reason: "Synthetic draft scenario",
        policy: {
          version: "draft-e2e-v1",
          name: "Synthetic draft fields",
          status: "project_baseline",
          fields: [
            { field: "quantity", label: "Quantity", value_type: "decimal", unit: "KG" },
            { field: "identifier", label: "Identifier", required: false },
            { field: "notes", label: "Notes", required: false },
          ],
        },
      },
    });
    expect(policy.ok()).toBeTruthy();
    state = (await policy.json()).workspace;
    const sheet = format === "xls" ? "Form" : "Review";
    const template = await request.post(`${root}/template`, {
      data: {
        revision: state.revision,
        filename: `synthetic.${format}`,
        content_base64: fixtures[format],
        version: "draft-e2e-template",
        mapping_version: "draft-e2e-mapping",
        mappings: [
          { field: "quantity", sheet, cell: "B2", required: true },
          { field: "identifier", sheet, cell: "B3", required: false },
          { field: "notes", sheet, cell: "D2", required: false },
        ],
      },
    });
    expect(template.ok()).toBeTruthy();
    state = (await template.json()).workspace;
    const uploaded = await request.post(`${root}/documents`, {
      data: {
        revision: state.revision,
        filename: "synthetic.pdf",
        content_base64: fixtures.pdf,
      },
    });
    expect(uploaded.ok()).toBeTruthy();
    state = (await uploaded.json()).workspace;
    for (const quote of ["Invoice", "21,000"]) {
      const response = await request.post(`${root}/observations`, {
        data: {
          revision: state.revision,
          field: "identifier",
          document_id: state.documents[0].id,
          document_type: "INVOICE",
          page: 1,
          quote,
          verified: false,
        },
      });
      expect(response.ok()).toBeTruthy();
      state = (await response.json()).workspace;
    }
    const edited = await request.post(`${root}/fields/quantity/canonical`, {
      data: {
        revision: state.revision,
        value: "21000",
        reason: "Reviewed synthetic quantity",
        reviewed: true,
      },
    });
    expect(edited.ok()).toBeTruthy();
    await page.goto(`/cases/${caseRecord.id}/review?section=export`);
    await expect(
      page.getByRole("button", { name: vi.review.exportNow, exact: true }),
    ).toBeDisabled();
    const draftResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/draft-exports") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: vi.review.exportDraft, exact: true }).click();
    expect((await draftResponse).status()).toBe(200);
    const downloadLink = page.getByRole("link", { name: new RegExp(vi.review.download) });
    await expect(downloadLink).toBeVisible();
    await expect(page.getByText(vi.review.draftLabel, { exact: true })).toBeVisible();
    const downloading = page.waitForEvent("download");
    await downloadLink.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(new RegExp(`^draft-review-.*\\.${format}$`));
    expect(await download.failure()).toBeNull();
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const values = JSON.parse(
      execFileSync(
        "uv",
        [
          "run",
          "--project",
          "services/api",
          "python",
          "-c",
          "import sys,json,xlrd,io; from pathlib import Path; from openpyxl import load_workbook; p=sys.argv[1]; f=sys.argv[2]; b=xlrd.open_workbook(p,formatting_info=True) if f=='xls' else load_workbook(io.BytesIO(Path(p).read_bytes())); s=b.sheet_by_name('Form') if f=='xls' else b['Review']; value=lambda r,c:s.cell_value(r,c) if f=='xls' else s.cell(r+1,c+1).value; print(json.dumps({'quantity':value(1,1),'identifier':value(2,1),'notice':value(1,3)}))",
          downloadedPath!,
          format,
        ],
        { encoding: "utf8" },
      ),
    );
    expect(values.quantity).toBe(21000);
    expect(values.identifier || null).toBeNull();
    expect(values.notice || null).toBeNull();
    await page.reload();
    await expect(downloadLink).toBeVisible();
    await expect(page.getByRole("button", { name: vi.review.approve, exact: true })).toBeDisabled();
    const result = await (await request.get(root)).json();
    expect(result.readiness.approved).toBe(false);
    expect(result.workspace.exports.at(-1).kind).toBe("draft");
    const denied = await request.post(`${root}/exports`, {
      data: { revision: result.workspace.revision },
    });
    expect(denied.status()).toBe(409);
    const originalExport = result.workspace.exports.at(-1);
    const exportingAgain = page.waitForResponse(
      (response) =>
        response.url().endsWith("/draft-exports") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: vi.review.exportDraft, exact: true }).click();
    expect((await exportingAgain).status()).toBe(200);
    const records = page.locator(".review-export-record");
    await expect(records).toHaveCount(2);
    await expect(records.first().getByText(vi.review.latestExport, { exact: true })).toBeVisible();
    await expect(records.nth(1)).toHaveAttribute("data-export-id", originalExport.id);
    const olderFile = records.nth(1).getByRole("link", {
      name: `${vi.review.download} · ${originalExport.filename}`,
      exact: true,
    });
    await olderFile.focus();
    const olderDownloadPromise = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const olderDownload = await olderDownloadPromise;
    expect(olderDownload.suggestedFilename()).toBe(originalExport.filename);
    expect(readFileSync((await olderDownload.path())!)).toEqual(readFileSync(downloadedPath!));
    await page.setViewportSize({ width: 390, height: 844 });
    await records.first().scrollIntoViewIfNeeded();
    const target = await records.first().getByRole("link").boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}
