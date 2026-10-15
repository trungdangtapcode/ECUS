import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import vi from "../../apps/web/src/locales/vi.json";

const pdf = execFileSync(
  "uv",
  [
    "run",
    "--project",
    "services/api",
    "python",
    "-c",
    "import runpy,base64;t=runpy.run_path('services/api/tests/test_review.py');print(base64.b64encode(t['pdf_bytes'](['Invoice','Total: 21,000'])).decode())",
  ],
  { encoding: "utf8" },
).trim();

for (const width of [1600, 1366, 768, 390, 320]) {
  test(`Harbor processing and 40-field call log spacing at ${width}px`, async ({
    page,
    request,
  }) => {
    const profiles = await (await request.get("/api/v1/reference/profiles")).json();
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `LAYOUT-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic processing layout",
        procedure: profiles[0].code,
      },
    });
    expect(created.ok()).toBe(true);
    const { id } = await created.json();
    const root = `/api/v1/cases/${id}/review`;
    const capabilities = await (await request.get(`${root}/processing-capabilities`)).json();
    expect(capabilities.test_environment && capabilities.mock_ai_transport).toBe(true);
    let revision = 0;
    const post = async (path: string, data: Record<string, unknown>) => {
      const response = await request.post(root + path, { data: { revision, ...data } });
      expect(response.ok()).toBe(true);
      const value = await response.json();
      revision = value.workspace.revision;
      return value;
    };
    await post("/template-profile", {
      profile_id: "export-form-v2",
      counts: { goods: 0, containers: 0 },
      reason: "Synthetic UI layout check",
    });
    await post("/policy", {
      reason: "Forty synthetic fields for log wrapping and scrolling",
      policy: {
        version: "synthetic-layout-v1",
        name: "Synthetic UI layout",
        status: "project_baseline",
        fields: [
          {
            field: "invoice_total",
            label: "integration.fields.invoice_total",
            value_type: "decimal",
            required: false,
          },
          ...Array.from({ length: 39 }, (_, index) => ({
            field: `synthetic_missing_supporting_document_field_${index}`,
            label: `Synthetic supporting document information requiring a long readable field label ${index}`,
            value_type: "text",
            required: false,
          })),
        ],
      },
    });
    await post("/documents", {
      filename: "synthetic-invoice-with-a-long-readable-document-filename.pdf",
      content_base64: pdf,
    });
    const submitted = await request.post(`${root}/processing`, {
      data: { revision, primary_invoice_id: null },
    });
    expect(submitted.status()).toBe(202);
    await expect
      .poll(async () => (await (await request.get(`${root}/processing`)).json())[0].status)
      .toBe("succeeded");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/cases/${id}/review?section=documents`);
    const language = page.getByRole("combobox", { name: vi.app.language });
    if (await language.count()) await language.selectOption("vi");
    const log = page.locator(".ai-trace-panel");
    await log.locator("summary").first().click();
    const call = log
      .locator(".ai-trace-call")
      .filter({ has: page.locator(".ai-trace-results > summary", { hasText: "40 mục" }) });
    await expect(call).toHaveCount(1);
    const resultSummary = call.locator(".ai-trace-results > summary");
    await expect(resultSummary).toContainText("1 hợp lệ");
    await expect(resultSummary).toContainText("39 không đề xuất");
    await resultSummary.click();
    await expect(call.locator(".ai-trace-validation li")).toHaveCount(40);
    await expect(call.locator(".ai-trace-field strong").first()).toContainText(
      vi.integration.fields.invoice_total,
    );
    const metrics = await call.evaluate((element) => {
      const list = element.querySelector(".ai-trace-validation")!;
      const actions = element.querySelector(".review-actions")!;
      const card = element.getBoundingClientRect(),
        table = list.getBoundingClientRect(),
        buttons = actions.getBoundingClientRect();
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        actionGap: buttons.y - table.bottom,
        tableInset: table.x - card.x,
        internalScroll: list.scrollHeight > list.clientHeight,
        actionsOutsideTable: !list.contains(actions),
        controlsContained: [...actions.querySelectorAll("button, a")].every((control) => {
          const box = control.getBoundingClientRect();
          return box.x >= card.x && box.right <= card.right;
        }),
      };
    });
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.actionGap).toBeGreaterThanOrEqual(16);
    expect(metrics.tableInset).toBeGreaterThanOrEqual(12);
    expect(metrics.internalScroll).toBe(true);
    expect(metrics.actionsOutsideTable).toBe(true);
    expect(metrics.controlsContained).toBe(true);
    await call.getByRole("button", { name: vi.aiTrace.inspect, exact: true }).click();
    await expect(call.locator(".ai-trace-detail pre")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await call.getByRole("button", { name: vi.aiTrace.inspect, exact: true }).click();
    if (width === 1600) {
      const recorded = await (await request.get(`${root}/ai-traces`)).json();
      const trace = recorded.items.find((item: { phase: string }) => item.phase === "extraction");
      let responseReady = false;
      await page.route(`**${root}/ai-traces?*`, async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        await route.fulfill({
          response,
          json: {
            ...body,
            items: body.items.map((item: { id: string }) =>
              item.id === trace.id
                ? { ...item, status: responseReady ? "succeeded" : "running" }
                : item,
            ),
          },
        });
      });
      await page.route(`**${root}/ai-traces/${trace.id}/content`, async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        await route.fulfill({ response, json: responseReady ? body : { ...body, response: null } });
      });
      await page.reload();
      await page.locator(".ai-trace-panel > summary").click();
      const live = page
        .locator(".ai-trace-call")
        .filter({ has: page.locator(".ai-trace-results > summary", { hasText: "40 mục" }) });
      await live.getByRole("button", { name: vi.aiTrace.inspect, exact: true }).click();
      await expect(live.locator(".ai-trace-detail pre").nth(1)).toHaveText("null");
      responseReady = true;
      await expect(live.locator(".ai-trace-detail pre").nth(1)).toContainText(
        "synthetic-test-only",
      );
      await page.unroute(`**${root}/ai-traces?*`);
      await page.unroute(`**${root}/ai-traces/${trace.id}/content`);
    }
    await page.route(`**${root}/processing`, async (route) => {
      const response = await route.fetch();
      const runs = await response.json();
      // Only the browser's read response changes; the real synthetic job is already complete.
      await route.fulfill({
        response,
        json: runs.map((run: Record<string, unknown>) => ({
          ...run,
          status: "running",
          progress: { phase: "classification", completed: 1, total: 4 },
        })),
      });
    });
    await page.reload();
    await expect(page.locator(".processing-progress")).toContainText("25%");
    const progress = page.getByRole("progressbar", { name: vi.processing.title });
    await expect(progress).toHaveAttribute("aria-valuenow", "25");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
