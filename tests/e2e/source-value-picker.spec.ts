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
      "import runpy,base64,json; d=runpy.run_path('services/api/tests/test_review.py'); print(json.dumps({'a':base64.b64encode(d['pdf_bytes'](['Destination','ALPHA TERMINAL'])).decode(),'b':base64.b64encode(d['pdf_bytes'](['Destination','BETA TERMINAL'])).decode(),'template':base64.b64encode(d['template_bytes']()).decode()}))",
    ],
    { encoding: "utf8" },
  ),
) as { a: string; b: string; template: string };

test("Quick source values stay synchronized with PDF evidence and preserve manual entry", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `CHOICE-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic source-backed value choice",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const policy = await request.post(`${root}/policy`, {
    data: {
      revision: 0,
      reason: "Configure synthetic destination review",
      policy: {
        version: "source-choice-v1",
        name: "Synthetic source choice",
        status: "project_baseline",
        fields: [{ field: "destination", label: "Destination" }],
      },
    },
  });
  expect(policy.ok()).toBeTruthy();
  let state = (await policy.json()).workspace;
  const template = await request.post(`${root}/template`, {
    data: {
      revision: state.revision,
      filename: "synthetic.xlsx",
      content_base64: fixtures.template,
      version: "choice-v1",
      mapping_version: "choice-mapping-v1",
      mappings: [{ field: "destination", sheet: "Review", cell: "B2", required: true }],
    },
  });
  expect(template.ok()).toBeTruthy();
  state = (await template.json()).workspace;
  for (const source of [
    { filename: "source-a.pdf", value: "ALPHA TERMINAL", content: fixtures.a },
    { filename: "source-b.pdf", value: "BETA TERMINAL", content: fixtures.b },
  ]) {
    const uploaded = await request.post(`${root}/documents`, {
      data: {
        revision: state.revision,
        filename: source.filename,
        content_base64: source.content,
      },
    });
    expect(uploaded.ok()).toBeTruthy();
    state = (await uploaded.json()).workspace;
    const document = state.documents.at(-1);
    const recorded = await request.post(`${root}/observations`, {
      data: {
        revision: state.revision,
        field: "destination",
        document_id: document.id,
        document_type: "INVOICE",
        page: 1,
        quote: source.value,
        verified: false,
      },
    });
    expect(recorded.ok()).toBeTruthy();
    state = (await recorded.json()).workspace;
  }
  const original = state;
  const sourceB = state.observations.find(
    (source: { normalized: string }) => source.normalized === "BETA TERMINAL",
  );
  await page.goto(`/cases/${id}/review?section=compare`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  const picker = page.getByRole("region", { name: en.review.quickSourceValue });
  const viewer = page.getByRole("navigation", { name: en.review.switchSource });
  const candidate = picker.getByLabel(en.review.sourceCandidateValue);
  // Full-width source choices must not add horizontal scrollbars during hover or press.
  for (const selector of [".evidence-source-options", ".source-picker-options"]) {
    const options = page.locator(selector);
    const choice = options.getByRole("button").last();
    await choice.hover();
    await expect
      .poll(() =>
        choice.evaluate(
          (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11,
        ),
      )
      .toBeLessThan(1);
    expect(await options.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
    await page.mouse.down();
    expect(await options.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
    await page.mouse.up();
  }
  await viewer.getByRole("button", { name: /ALPHA TERMINAL.*source-a.pdf/ }).click();
  await expect(candidate).toHaveText("ALPHA TERMINAL");
  await picker.getByRole("button", { name: /BETA TERMINAL.*source-b.pdf/ }).click();
  await expect(candidate).toHaveText("BETA TERMINAL");
  await expect(page.locator(".source-dock-header")).toContainText("source-b.pdf");
  await expect(page.locator(".source-dock .review-pdf")).toHaveAttribute(
    "data-render-status",
    "ready",
  );
  expect((await (await request.get(root)).json()).workspace).toEqual(original);
  await picker.getByRole("button", { name: en.review.useViewedValue, exact: true }).click();
  const form = picker.locator("form");
  await expect(form.getByRole("button", { name: en.integration.saveValue })).toBeDisabled();
  await form.getByLabel(en.processing.confirmEdit, { exact: true }).check();
  await viewer.getByRole("button", { name: /ALPHA TERMINAL.*source-a.pdf/ }).click();
  await expect(candidate).toHaveText("ALPHA TERMINAL");
  await expect(form.getByLabel(en.processing.confirmEdit, { exact: true })).not.toBeChecked();
  await expect(form.getByLabel(en.integration.editReason, { exact: true })).toHaveValue(
    /source-a\.pdf/,
  );
  await picker.getByRole("button", { name: /BETA TERMINAL.*source-b.pdf/ }).click();
  await form.getByLabel(en.processing.confirmEdit, { exact: true }).check();
  const saving = page.waitForResponse(
    (response) =>
      response.url().endsWith("/fields/destination/canonical") &&
      response.request().method() === "POST",
  );
  await form.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  expect((await saving).status()).toBe(200);
  await expect(form).toHaveCount(0);
  const chosen = await (await request.get(root)).json();
  expect(chosen.workspace.canonical_values.destination.source_observation_id).toBe(sourceB.id);
  expect(chosen.workspace.canonical_values.destination.source_ids).toEqual([sourceB.id]);
  expect(chosen.workspace.canonical_values.destination.value).toBe("BETA TERMINAL");
  expect(chosen.workspace.observations).toEqual(original.observations);
  expect(
    chosen.readiness.comparisons.find((item: { field: string }) => item.field === "destination")
      .resolved,
  ).toBe(true);
  await page.reload();
  await page.getByLabel(en.integration.findField).fill("destination");
  await page.locator(".harbor-issue-list button").first().click();
  const editor = page.locator('.canonical-entry[data-field="destination"]');
  await expect(editor.locator("input[readonly]")).toHaveValue("BETA TERMINAL");
  await editor.locator(".canonical-edit-link").click();
  await editor.getByLabel(en.integration.value, { exact: true }).fill("GAMMA DEPOT");
  await viewer.getByRole("button", { name: /BETA TERMINAL.*source-b.pdf/ }).click();
  await expect(candidate).toHaveText("BETA TERMINAL");
  await expect(editor.getByLabel(en.integration.value, { exact: true })).toHaveValue("GAMMA DEPOT");
  await editor
    .getByLabel(en.integration.editReason, { exact: true })
    .fill("Reviewed a separate consolidated destination");
  await editor.getByLabel(en.processing.confirmEdit, { exact: true }).check();
  await editor.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
  await expect(editor.locator("input[readonly]")).toHaveValue("GAMMA DEPOT");
  const manual = await (await request.get(root)).json();
  expect(manual.workspace.canonical_values.destination.source_observation_id).toBeNull();
  expect(manual.workspace.canonical_history.at(-1).destination.source_observation_id).toBe(
    sourceB.id,
  );
  expect(manual.workspace.observations).toEqual(original.observations);
});
