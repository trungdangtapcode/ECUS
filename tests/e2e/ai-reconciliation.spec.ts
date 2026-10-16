import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
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
      `
import base64,io,json,runpy,sys
sys.path.insert(0,'services/api/tests')
from openpyxl import Workbook
values=runpy.run_path('services/api/tests/test_reconciliation.py')['VALUES']
pdf=runpy.run_path('services/api/tests/test_review.py')['pdf_bytes']
book=Workbook();book.active.title='Review';book.active['A1']='Synthetic review';out=io.BytesIO();book.save(out)
print(json.dumps({'values':values,'template':base64.b64encode(out.getvalue()).decode(),'pdfs':[base64.b64encode(pdf(['Synthetic source',*[v[i][0] for v in values.values()]])).decode() for i in range(2)]}))
`,
    ],
    { encoding: "utf8" },
  ),
) as { values: Record<string, [string, string][]>; template: string; pdfs: string[] };

test("One AI call groups equivalent values, supports text C, and leaves real differences to source selection", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `SEM-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic semantic review",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const fields = Object.keys(fixtures.values);
  let revision = 0;
  let original: any;
  const post = async (path: string, data: Record<string, unknown>) => {
    const response = await request.post(root + path, { data: { revision, ...data } });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    original = result.workspace;
    revision = original.revision;
    return result;
  };
  await post("/policy", {
    reason: "Synthetic field configuration",
    policy: {
      version: "semantic-e2e-v1",
      name: "Synthetic semantic review",
      status: "project_baseline",
      fields: fields.map((field) => ({
        field,
        label: field,
        value_type: ["package_quantity", "total_fees"].includes(field) ? "decimal" : "text",
      })),
    },
  });
  await post("/template", {
    filename: "synthetic.xlsx",
    content_base64: fixtures.template,
    version: "semantic-v1",
    mapping_version: "semantic-v1",
    mappings: fields.map((field, index) => ({
      field,
      sheet: "Review",
      cell: `B${index + 2}`,
      required: false,
    })),
  });
  for (let index = 0; index < 2; index++) {
    await post("/documents", {
      filename: `source-${index}.pdf`,
      content_base64: fixtures.pdfs[index],
    });
    const document_id = original.documents.at(-1).id;
    for (const field of fields) {
      const [quote, unit] = fixtures.values[field]![index]!;
      await post("/observations", {
        document_id,
        document_type: "INVOICE",
        page: 1,
        quote,
        unit,
        field,
        value_type: ["package_quantity", "total_fees"].includes(field) ? "decimal" : "text",
        verified: false,
      });
    }
  }
  const originalSources = original.observations;
  await page.goto(`/cases/${id}/review?section=compare`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  const panel = page.getByRole("region", { name: en.reconciliation.title });
  await panel.getByRole("button", { name: en.reconciliation.start, exact: true }).click();
  await expect(
    panel.getByRole("button", { name: en.reconciliation.cached, exact: true }),
  ).toBeDisabled({ timeout: 20000 });
  await expect(panel.locator(".ai-equivalent-row")).toHaveCount(5);
  const issues = page.locator(".harbor-issue-list");
  await expect(issues).toContainText("total_fees");
  await expect(issues).toContainText("loading_port_name");
  await expect(issues).not.toContainText("package_unit");
  const untouched = await (await request.get(root)).json();
  expect(untouched.workspace.observations).toEqual(originalSources);
  expect(untouched.workspace.canonical_values).toEqual({});
  expect(untouched.readiness.approved).toBe(false);
  expect(untouched.workspace.approved_revision).toBeNull();
  const batch = untouched.workspace.ai_reconciliation;
  const companyRow = panel.locator(".ai-equivalent-row").filter({ hasText: "company_name" });
  await companyRow.getByRole("button", { name: en.reconciliation.inspect }).click();
  const suggestion = page.getByRole("region", { name: en.reconciliation.proposal });
  await expect(suggestion).toContainText(en.reconciliation.standardizedProposal);
  await expect(suggestion).toContainText("Example Company, Joint Stock Company");
  await expect(page.locator(".source-dock .review-pdf")).toHaveAttribute(
    "data-render-status",
    "ready",
  );
  await panel
    .getByRole("button", { name: en.reconciliation.confirmEquivalent.replace("{{count}}", "5") })
    .click();
  const confirmation = panel.locator(".ai-reconciliation-confirm");
  await expect(confirmation.getByRole("button", { name: en.integration.saveValue })).toBeDisabled();
  await confirmation.getByLabel(en.reconciliation.confirmReview, { exact: true }).check();
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/reconciliations/${batch.id}/apply`) &&
      response.request().method() === "POST",
  );
  await confirmation.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(panel.locator(".ai-equivalent-row")).toHaveCount(0);
  await expect(page.locator('.canonical-entry[data-field="company_name"]')).toContainText(
    en.integration.aiConfirmedValue,
  );
  const confirmed = await (await request.get(root)).json();
  expect(confirmed.workspace.canonical_values.company_name.value).toBe(
    "Example Company, Joint Stock Company",
  );
  expect(confirmed.workspace.canonical_values.company_name.ai_reconciliation_id).toBe(batch.id);
  expect(confirmed.workspace.canonical_values.package_quantity.unit).toBe("BOX");
  expect(confirmed.workspace.observations).toEqual(originalSources);
  await page.reload();
  await expect(
    panel.getByRole("button", { name: en.reconciliation.cached, exact: true }),
  ).toBeDisabled();
  const cached = await request.post(`${root}/reconciliations`, {
    data: { revision: confirmed.workspace.revision, locale: "vi" },
  });
  expect((await cached.json()).id).toBe(batch.id);
  await page.getByLabel(en.integration.findField).fill("total_fees");
  await issues.getByRole("button").first().click();
  await expect(suggestion).toContainText(en.reconciliation.classifications.different);
  const picker = page.getByRole("region", { name: en.review.quickSourceValue });
  await picker.getByRole("button", { name: /87000 VND.*source-1.pdf/ }).click();
  await expect(page.locator(".source-dock-header")).toContainText("source-1.pdf");
  await expect(page.locator(".source-dock .review-pdf")).toHaveAttribute(
    "data-render-status",
    "ready",
  );
  await picker.getByRole("button", { name: en.review.useViewedValue }).click();
  const sourceForm = picker.locator("form");
  await sourceForm.getByLabel(en.processing.confirmEdit, { exact: true }).check();
  await sourceForm.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  await expect(
    page.locator('.canonical-entry[data-field="total_fees"] input[readonly]'),
  ).toHaveValue("87000 VND");
  const final = await (await request.get(root)).json();
  expect(final.workspace.canonical_values.total_fees.ai_reconciliation_id).toBeNull();
  expect(final.workspace.observations).toEqual(originalSources);
  const traces = await (await request.get(`${root}/ai-traces?limit=50`)).json();
  expect(
    traces.items.filter((call: { phase: string }) => call.phase === "reconciliation"),
  ).toHaveLength(1);
  const trace = traces.items[0];
  const detail = await (await request.get(`${root}/ai-traces/${trace.id}/content`)).json();
  const input = JSON.parse(detail.request.body.messages[1].content[0].text);
  expect(input.fields).toHaveLength(7);
  expect(detail.response.choices).toBeDefined();
});
