import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import en from "../../apps/web/src/locales/en.json";
import vi from "../../apps/web/src/locales/vi.json";

// Real local OCR and the isolated synthetic HTTP provider; never a paid AI transport.
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
import runpy,base64,json,io
from PIL import Image,ImageDraw,ImageFont
d=runpy.run_path('services/api/tests/test_review.py')
image=Image.new('RGB',(1200,1600),'white')
draw=ImageDraw.Draw(image)
font=ImageFont.load_default(size=40)
draw.text((80,100),'BILL OF LADING',fill='black',font=font)
draw.text((80,180),'Total: 21,000',fill='black',font=font)
draw.text((80,260),'Synthetic cargo document',fill='black',font=font)
output=io.BytesIO()
image.save(output,format='PDF',resolution=144)
print(json.dumps({'invoice':base64.b64encode(d['pdf_bytes'](['Invoice','Total: 21,000'])).decode(),'conflict':base64.b64encode(d['pdf_bytes'](['BILL OF LADING','Total: 22,000'])).decode(),'scan':base64.b64encode(output.getvalue()).decode()}))
`,
    ],
    { encoding: "utf8" },
  ),
) as { invoice: string; scan: string; conflict: string };

for (const conflict of [false, true]) {
  test(`Harbor document-set processing: ${conflict ? "correct a conflict" : "OCR and confirm agreeing sources"}`, async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    const profiles = await (await request.get("/api/v1/reference/profiles")).json();
    const templates = await (await request.get("/api/v1/reference/excel-templates")).json();
    const template =
      templates.find((item: { id: string }) => item.id === "export-form-v2") ??
      templates.find((item: { id: string }) => item.id === "export-form-v1");
    expect(template, "Import the blank export form into the isolated test project.").toBeTruthy();
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `PROCESS-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic processing review",
        procedure: profiles[0].code,
      },
    });
    const { id } = await created.json();
    const root = `/api/v1/cases/${id}/review`;
    const capabilities = await (await request.get(`${root}/processing-capabilities`)).json();
    expect(
      capabilities.test_environment && capabilities.mock_ai_transport,
      "Run these tests only with the isolated Compose AI stub; no live provider is permitted.",
    ).toBe(true);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/cases/${id}/review`);
    const language = page.getByRole("combobox", { name: en.app.language });
    if (await language.count()) await language.selectOption("en");
    else await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
    await page.getByLabel(en.integration.profile).selectOption(template.id);
    await page.getByLabel(en.integration.groups.goods, { exact: true }).fill("0");
    await page.getByLabel(en.integration.groups.containers, { exact: true }).fill("0");
    await page.getByLabel(en.integration.setupReason).fill("Reviewed blank workbook layout");
    await page.getByRole("button", { name: en.integration.applyProfile, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.integration.updateProfile, exact: true }),
    ).toBeVisible();
    await page.getByLabel(en.review.upload).setInputFiles([
      {
        name: "invoice.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(fixtures.invoice, "base64"),
      },
      {
        name: conflict ? "transport.pdf" : "scan.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(conflict ? fixtures.conflict : fixtures.scan, "base64"),
      },
    ]);
    await expect(page.locator(".document-row")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: en.processing.start, exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: en.processing.start, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.processing.reviewResults, exact: true }),
    ).toBeVisible({ timeout: 60000 });
    const processed = (await (await request.get(root)).json()).workspace;
    expect(processed.observations).toHaveLength(2);
    expect(processed.observations.every((source: { verified: boolean }) => !source.verified)).toBe(
      true,
    );
    expect(processed.logical_documents).toHaveLength(2);
    if (!conflict) {
      expect(processed.documents[1].ocr_pages["1"].words.length).toBeGreaterThan(0);
      expect(processed.documents[1].pages[0]).toBe("");
    }
    const tracePanel = page.locator(".ai-trace-panel");
    await tracePanel.locator("summary").first().click();
    await expect(tracePanel.locator(".ai-trace-call")).toHaveCount(4);
    await expect(tracePanel).toContainText("synthetic-test-only");
    await tracePanel.getByRole("button", { name: en.aiTrace.inspect }).first().click();
    await expect(tracePanel.getByRole("heading", { name: en.aiTrace.request })).toBeVisible();
    await expect(tracePanel.getByRole("heading", { name: en.aiTrace.response })).toBeVisible();
    const traceRecords = await (await request.get(`${root}/ai-traces`)).json();
    expect(traceRecords.items).toHaveLength(4);
    expect(
      traceRecords.items.every(
        (item: { job_id: string; status: string }) => item.job_id && item.status === "succeeded",
      ),
    ).toBe(true);
    expect(
      traceRecords.items
        .filter((item: { phase: string }) => item.phase === "extraction")
        .every((item: { validation: { status: string }[] }) =>
          item.validation.some((field) => field.status === "accepted"),
        ),
    ).toBe(true);
    const traceDownload = page.waitForEvent("download");
    await tracePanel.getByRole("link", { name: en.aiTrace.download }).first().click();
    const traceFile = await traceDownload;
    expect(traceFile.suggestedFilename()).toMatch(/^ai-call-.*\.json$/);
    await tracePanel.locator("summary").first().click();
    await page.getByRole("button", { name: en.processing.reviewResults, exact: true }).click();
    if (conflict) {
      await expect(page.locator(".harbor-issue-list .has-source-conflict")).toContainText(
        en.processing.sourceConflict,
      );
      await expect(page.locator(".issue-value-preview")).toContainText("21000");
      await expect(page.locator(".issue-value-preview")).toContainText("22000");
      await expect(page.locator(".review-source-conflict")).toContainText(
        en.processing.sourceConflictNotice,
      );
      const beforeReview = await (await request.get(root)).json();
      expect(
        beforeReview.readiness.comparisons.find(
          (item: { field: string }) => item.field === "invoice_total",
        ).source_values_differ,
      ).toBe(true);
      expect(
        beforeReview.readiness.comparisons.find(
          (item: { field: string }) => item.field === "invoice_total",
        ).status,
      ).toBe("EXTRACTION_UNCERTAIN");
      expect(beforeReview.readiness.eligible).toBe(false);
      const editor = page.locator('[data-field="invoice_total"]');
      await editor.getByRole("button", { name: en.integration.editValue, exact: true }).click();
      await editor.getByLabel(en.integration.value, { exact: true }).fill("21000.50");
      await editor
        .getByLabel(en.integration.editReason)
        .fill("Corrected after checking the invoice and transport evidence");
      await editor.getByLabel(en.processing.confirmEdit).check();
      await editor.getByRole("button", { name: en.integration.saveValue, exact: true }).click();
      await expect(editor.locator("input[readonly]")).toHaveValue("21000.50");
    } else {
      const review = page.locator(".consistent-review-panel");
      await review.getByRole("button", { name: /B\/L/ }).click();
      await expect(page.locator(".review-pdf canvas")).toBeVisible();
      await expect(page.locator(".review-pdf")).toContainText(en.workbench.matches);
      await review.getByLabel(en.processing.selectVisible).check();
      await review
        .getByLabel(en.review.reason)
        .fill("Compared both original source values and their document types");
      await review.getByRole("button", { name: "Confirm 1 reviewed fields", exact: true }).click();
      await expect(page.locator(".consistent-review-panel")).toHaveCount(0);
    }
    await page.getByRole("button", { name: en.review.export, exact: true }).click();
    await page
      .getByLabel(en.review.reason)
      .fill("Reviewed consolidated values; red cells identify missing data");
    await page.getByRole("button", { name: en.review.approve, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.review.exportNow, exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: en.review.exportNow, exact: true }).click();
    const link = page.getByRole("link", { name: new RegExp(en.review.download) });
    await expect(link).toBeVisible();
    const download = page.waitForEvent("download");
    await link.click();
    const file = await download;
    const values = JSON.parse(
      execFileSync(
        "uv",
        [
          "run",
          "--project",
          "services/api",
          "python",
          "-c",
          "import sys,json,openpyxl;b=openpyxl.load_workbook(open(sys.argv[1],'rb'));print(json.dumps({'total':b['TKX']['U53'].value,'red':b['TKX']['U54'].fill.fgColor.rgb,'missing':b['TKX']['U54'].value}))",
          (await file.path())!,
        ],
        { encoding: "utf8" },
      ),
    );
    expect(values).toEqual({ total: conflict ? 21000.5 : 21000, red: "FFF2CCCC", missing: null });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: en.review.documents, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
