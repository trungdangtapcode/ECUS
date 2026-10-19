import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

const fixtures = JSON.parse(
  execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import runpy,base64,json;d=runpy.run_path('services/api/tests/test_review.py');enc=lambda b:base64.b64encode(b).decode();print(json.dumps({'pdf':enc(d['pdf_bytes'](['INVOICE','Destination: ALPHA TERMINAL'])),'template':enc(d['template_bytes']())}))",
    ],
    { encoding: "utf8" },
  ),
) as { pdf: string; template: string };

for (const width of [1440, 768, 390, 320]) {
  test(`Review content keeps readable gutters and group spacing at ${width}px`, async ({
    page,
    request,
  }) => {
    const profiles = await (await request.get("/api/v1/reference/profiles")).json();
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `SPACING-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic workspace spacing",
        procedure: profiles[0].code,
      },
    });
    expect(created.ok()).toBe(true);
    const { id } = await created.json();
    const root = `/api/v1/cases/${id}/review`;
    let revision = 0;
    const post = async (endpoint: string, data: Record<string, unknown>) => {
      const response = await request.post(root + endpoint, { data: { revision, ...data } });
      expect(response.ok()).toBe(true);
      const result = await response.json();
      revision = result.workspace.revision;
      return result.workspace;
    };
    await post("/policy", {
      reason: "Synthetic spacing verification",
      policy: {
        version: "spacing-v1",
        name: "Synthetic spacing rules",
        status: "project_baseline",
        fields: [{ field: "destination", label: "Destination" }],
      },
    });
    await post("/template", {
      filename: "synthetic-spacing.xlsx",
      content_base64: fixtures.template,
      version: "spacing-v1",
      mapping_version: "spacing-v1",
      mappings: [{ field: "destination", sheet: "Review", cell: "B2", required: true }],
    });
    const uploaded = await post("/documents", {
      filename: "synthetic-invoice.pdf",
      content_base64: fixtures.pdf,
    });
    await post("/observations", {
      field: "destination",
      document_id: uploaded.documents.at(-1).id,
      document_type: "INVOICE",
      page: 1,
      quote: "ALPHA TERMINAL",
      verified: false,
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const section of [
      "detail",
      "documents",
      "compare",
      "canonical",
      "export",
      "rules",
      "audit",
    ]) {
      await page.goto(
        section === "detail" ? `/cases/${id}` : `/cases/${id}/review?section=${section}`,
      );
      await expect(
        page.locator(".detail-card, .review-section, .canonical-sheet").first(),
      ).toBeVisible();
      await expect(page.locator("main")).toHaveAttribute("data-motion-state", "idle");
      const metrics = await page.evaluate((section) => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const gap = (before: string, after: string) => box(after).top - box(before).bottom;
        const result: Record<string, number> = {
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
        if (section === "detail") {
          result.actionGap = gap(".detail-card > h2", ".detail-card > .button");
        } else if (section === "canonical") {
          const sheet = box(".canonical-sheet");
          result.headingInset = box(".canonical-columns h2").left - sheet.left;
          result.searchGap = gap(".canonical-columns", ".review-field-search");
          result.footerInset = sheet.bottom - box(".canonical-actions").bottom;
        } else if (section === "compare") {
          result.searchGap = gap(".review-section > .review-hint", ".review-field-search");
        } else if (section === "rules") {
          result.reasonGap = gap(".review-section > .info-note", ".review-settings-stack");
          result.stageGap = gap(".review-settings-stack > p", ".review-settings-stack > p + label");
          result.headingGap = gap(
            ".review-settings-stack > .review-table-wrap",
            ".review-settings-stack > .review-table-wrap + h3",
          );
        } else if (section === "export") {
          result.countsGap = gap(".export-coverage > p", ".export-coverage-counts");
          result.actionGap = gap(".export-coverage-counts", ".export-coverage > .button");
        } else if (section === "documents") {
          result.sourceActionGap = gap(
            ".review-document-inspector > .review-form-grid",
            ".review-document-inspector > .back-link",
          );
          result.previewGap = gap(
            ".review-document-inspector > .back-link",
            ".review-document-inspector > .button",
          );
        } else {
          result.paginationGap = gap(".review-section > .review-hint", ".canonical-pagination");
        }
        return result;
      }, section);
      expect(metrics.overflow, `${section} horizontal overflow`).toBeLessThanOrEqual(0);
      for (const [name, value] of Object.entries(metrics)) {
        if (name !== "overflow") expect(value, `${section}: ${name}`).toBeGreaterThanOrEqual(12);
      }
    }
    expect(errors).toEqual([]);
  });
}
