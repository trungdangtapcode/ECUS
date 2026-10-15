import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import vi from "../../apps/web/src/locales/vi.json";

test("V2 form definitions are adopted explicitly and draft remarks stay clean", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `FORM-V2-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic form definition upgrade",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const initial = await request.post(`${root}/template-profile`, {
    data: {
      revision: 0,
      profile_id: "original-form-xls-v6",
      counts: { goods: 0, containers: 0 },
      reason: "Original synthetic form configuration",
    },
  });
  expect(initial.ok()).toBeTruthy();
  let state = (await initial.json()).workspace;
  const pdf = execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import runpy,base64; d=runpy.run_path('services/api/tests/test_review.py'); print(base64.b64encode(d['pdf_bytes'](['Synthetic invoice','USD'])).decode())",
    ],
    { encoding: "utf8" },
  ).trim();
  const uploaded = await request.post(`${root}/documents`, {
    data: { revision: state.revision, filename: "synthetic.pdf", content_base64: pdf },
  });
  expect(uploaded.ok()).toBeTruthy();
  state = (await uploaded.json()).workspace;
  const reviewed = await request.post(`${root}/fields/invoice_currency/canonical`, {
    data: { revision: state.revision, value: "USD", reviewed: true, reason: "Reviewed currency" },
  });
  expect(reviewed.ok()).toBeTruthy();
  await page.goto(`/cases/${id}/review?section=documents`);
  await page
    .getByRole("combobox", { name: vi.integration.profile, exact: true })
    .selectOption("original-form-xls-v8");
  await page.getByLabel(vi.integration.adoptProfileRules, { exact: true }).check();
  await page
    .getByLabel(vi.integration.setupReason, { exact: true })
    .fill("Adopt revised field definitions");
  const adopting = page.waitForResponse(
    (r) => r.url().endsWith("/template-profile") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: vi.integration.updateProfile, exact: true }).click();
  expect((await adopting).status()).toBe(200);
  const result = await (await request.get(root)).json();
  state = result.workspace;
  expect(
    state.policy.fields.find((f: { field: string }) => f.field === "invoice_incoterm").description,
  ).toContain("printed Incoterm");
  expect(
    result.readiness.comparisons.find((f: { field: string }) => f.field === "invoice_currency")
      .resolved,
  ).toBe(false);
  expect(state.canonical_values.invoice_currency.value).toBe("USD");
  const office = state.template.mappings.filter(
    (m: { field: string }) => m.field === "declaration_office",
  );
  expect(office.some((m: { cell: string }) => m.cell === "I70")).toBe(true);
  await page.getByRole("button", { name: vi.review.export, exact: true }).click();
  await page.getByText(vi.integration.showMissing, { exact: true }).click();
  await expect(page.getByText(vi.integration.blankUnreviewed).first()).toBeVisible();
  await page.getByRole("button", { name: vi.review.exportDraft, exact: true }).click();
  await expect(page.getByRole("link", { name: new RegExp(vi.review.download) })).toBeVisible();
  const exported = await (await request.get(root)).json();
  const record = exported.workspace.exports.at(-1);
  expect(record.annotation_fields).toEqual([]);
  expect(record.values_snapshot.notes).toBeNull();
  expect(exported.readiness.approved).toBe(false);
});
