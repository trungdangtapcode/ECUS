import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import en from "../../apps/web/src/locales/en.json";
import vi from "../../apps/web/src/locales/vi.json";

const pdf = execFileSync(
  "uv",
  [
    "run",
    "--project",
    "services/api",
    "python",
    "-c",
    "import runpy,base64; d=runpy.run_path('services/api/tests/test_review.py'); print(base64.b64encode(d['pdf_bytes'](['Invoice','21,000','21,000'])).decode())",
  ],
  { encoding: "utf8" },
).trim();

test("PDF evidence waits for rendering and marks every repeated quote candidate", async ({
  page,
  request,
}) => {
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `PDF-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic repeated PDF evidence",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  const uploaded = await request.post(`${root}/documents`, {
    data: { revision: 0, filename: "repeated.pdf", content_base64: pdf },
  });
  expect(uploaded.ok()).toBeTruthy();
  const state = (await uploaded.json()).workspace;
  const document = state.documents[0];
  const recorded = await request.post(`${root}/observations`, {
    data: {
      revision: state.revision,
      field: "quantity",
      document_id: document.id,
      document_type: "INVOICE",
      page: 1,
      quote: "21,000",
      source_offset: document.pages[0].indexOf("21,000"),
      value_type: "decimal",
      unit: "KG",
    },
  });
  expect(recorded.ok()).toBeTruthy();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${root}/documents/${document.id}/content`, async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.goto(`/cases/${id}/review?section=compare`);
    await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
    await page.getByRole("button", { name: "INVOICE · Page 1", exact: true }).click();
    const preview = page.locator(".source-dock .review-pdf");
    await expect(preview).toHaveAttribute("data-render-status", "loading");
    await expect(preview.getByRole("status")).toHaveText(en.workbench.reading);
    release();
    await expect(preview).toHaveAttribute("data-render-status", "ready");
    await expect(preview.getByRole("status")).toHaveCount(0);
    await expect(preview).toHaveAttribute("data-highlight-count", "2");
    await expect(preview).toHaveAttribute("data-highlight-ambiguous", "true");
    await expect(preview).toContainText(en.workbench.ambiguousTextMatch.replace("{{count}}", "2"));
    const paintedPixels = await preview.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! > 220 && data[i + 1]! > 150 && data[i + 2]! < 210) count++;
      }
      return count;
    });
    expect(paintedPixels).toBeGreaterThan(100);
  } finally {
    release();
  }
});

test("Source choices switch the document and physical page without changing review decisions", async ({
  page,
  request,
}) => {
  const secondPdf = execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import runpy,base64,io; from pypdf import PdfReader,PdfWriter; d=runpy.run_path('services/api/tests/test_review.py'); w=PdfWriter(); [w.add_page(PdfReader(io.BytesIO(d['pdf_bytes'](lines))).pages[0]) for lines in [['Cover page'],['Second evidence','22,000']]]; o=io.BytesIO(); w.write(o); print(base64.b64encode(o.getvalue()).decode())",
    ],
    { encoding: "utf8" },
  ).trim();
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `SOURCES-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic document evidence switching",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  let state = (await (await request.get(root)).json()).workspace;
  for (const source of [
    { filename: "first-source.pdf", content: pdf, page: 1, quote: "21,000" },
    { filename: "second-source.pdf", content: secondPdf, page: 2, quote: "22,000" },
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
        field: "quantity",
        document_id: document.id,
        document_type: "OTHER",
        page: source.page,
        quote: source.quote,
        source_offset: document.pages[source.page - 1].indexOf(source.quote),
        value_type: "decimal",
        unit: "KG",
      },
    });
    expect(recorded.ok()).toBeTruthy();
    state = (await recorded.json()).workspace;
  }
  const before = state;
  await page.goto(`/cases/${id}/review?section=compare`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  const sources = page.getByRole("navigation", { name: en.review.switchSource });
  await expect(sources.getByRole("button")).toHaveCount(2);
  const second = sources.getByRole("button", { name: /22000 KG.*second-source.pdf.*Page 2/ });
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".source-dock-header")).toContainText("second-source.pdf");
  await expect(page.locator(".selected-source-quote")).toHaveText("22,000");
  const preview = page.locator(".source-dock .review-pdf");
  await expect(preview).toHaveAttribute("data-render-status", "ready");
  await expect(preview).toHaveAttribute("data-highlight-count", "1");
  const first = sources.getByRole("button", { name: /21000 KG.*first-source.pdf.*Page 1/ });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(second).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".source-dock-header")).toContainText("first-source.pdf");
  await expect(page.locator(".selected-source-quote")).toHaveText("21,000");
  await expect(preview).toHaveAttribute("data-render-status", "ready");
  await expect(preview).toHaveAttribute("data-highlight-count", "2");
  await page.setViewportSize({ width: 390, height: 844 });
  await sources.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const after = (await (await request.get(root)).json()).workspace;
  expect(after.revision).toBe(before.revision);
  expect(after.observations).toEqual(before.observations);
  expect(after.canonical_values).toEqual(before.canonical_values);
  expect(after.selections).toEqual(before.selections);
});

test("PDF and compact source lists scroll independently without moving the page", async ({
  page,
  request,
}) => {
  const documents = JSON.parse(
    execFileSync(
      "uv",
      [
        "run",
        "--project",
        "services/api",
        "python",
        "-c",
        "import runpy,base64,json; d=runpy.run_path('services/api/tests/test_review.py'); print(json.dumps([{'filename':f'source-{i}.pdf','quote':f'{32000+i*1000:,}','pdf':base64.b64encode(d['pdf_bytes']([f'Independent source {i}',f'{32000+i*1000:,}'])).decode()} for i in range(6)]))",
      ],
      { encoding: "utf8" },
    ),
  ) as { filename: string; quote: string; pdf: string }[];
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  const created = await request.post("/api/v1/cases", {
    data: {
      reference: `SCROLL-${crypto.randomUUID().slice(0, 8)}`,
      title: "Synthetic independent evidence scrolling",
      procedure: profiles[0].code,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const root = `/api/v1/cases/${id}/review`;
  let state = (await (await request.get(root)).json()).workspace;
  for (const source of documents) {
    const uploaded = await request.post(`${root}/documents`, {
      data: {
        revision: state.revision,
        filename: source.filename,
        content_base64: source.pdf,
      },
    });
    expect(uploaded.ok()).toBeTruthy();
    state = (await uploaded.json()).workspace;
    const document = state.documents.at(-1);
    const recorded = await request.post(`${root}/observations`, {
      data: {
        revision: state.revision,
        field: "quantity",
        document_id: document.id,
        document_type: "OTHER",
        page: 1,
        quote: source.quote,
        value_type: "decimal",
        unit: "KG",
      },
    });
    expect(recorded.ok()).toBeTruthy();
    state = (await recorded.json()).workspace;
  }
  const before = state;
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/cases/${id}/review?section=compare`);
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  const dock = page.locator(".source-dock");
  const sourceList = dock.locator(".evidence-source-options");
  await sourceList.getByRole("button").first().click();
  const preview = dock.locator(".review-pdf");
  await expect(preview).toHaveAttribute("data-render-status", "ready");
  await dock.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const documentPane = page.getByRole("region", { name: en.review.scrollDocument });
  await expect
    .poll(() => documentPane.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  const windowBefore = await page.evaluate(() => window.scrollY);
  const headerBefore = await dock.locator(".source-dock-header").boundingBox();
  await documentPane.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => documentPane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(windowBefore);
  expect((await dock.locator(".source-dock-header").boundingBox())!.y).toBe(headerBefore!.y);
  for (const direction of [1, -1]) {
    await documentPane.evaluate((element, sign) => {
      element.scrollTop = sign > 0 ? element.scrollHeight : 0;
    }, direction);
    await documentPane.hover();
    await page.mouse.wheel(0, direction * 600);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.scrollY)).toBe(windowBefore);
  }
  const listHeight = (await sourceList.boundingBox())!.height;
  const rowHeight = (await sourceList.getByRole("button").first().boundingBox())!.height;
  expect(listHeight).toBeGreaterThan(rowHeight * 2);
  expect(listHeight).toBeLessThan(rowHeight * 3);
  await sourceList.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => sourceList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await documentPane.evaluate((element) => element.scrollTop)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(windowBefore);
  await documentPane.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await sourceList.getByRole("button").last().click();
  await expect(dock.locator(".source-dock-header")).toContainText("source-5.pdf");
  await expect(preview).toHaveAttribute("data-render-status", "ready");
  expect(await documentPane.evaluate((element) => element.scrollTop)).toBe(0);
  await documentPane.focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => documentPane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(windowBefore);
  await page.setViewportSize({ width: 1600, height: 600 });
  expect((await dock.boundingBox())!.height).toBeLessThanOrEqual(600);
  expect((await documentPane.boundingBox())!.height).toBeGreaterThan(100);
  const after = (await (await request.get(root)).json()).workspace;
  expect(after).toEqual(before);
});
