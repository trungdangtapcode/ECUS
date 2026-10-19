import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import vi from "../../apps/web/src/locales/vi.json";
import en from "../../apps/web/src/locales/en.json";

async function expectIndicatorAligned(tabs: Locator) {
  await expect
    .poll(() =>
      tabs.evaluate((element) => {
        const active = element.querySelector<HTMLElement>(
          '[aria-current="page"], [aria-pressed="true"]',
        )!;
        const target = active.getBoundingClientRect();
        const indicator = active.querySelector(".motion-tab-indicator")!.getBoundingClientRect();
        return Math.max(
          Math.abs(indicator.left - target.left),
          Math.abs(indicator.width - target.width),
          Math.abs(indicator.bottom - target.bottom - 1),
        );
      }),
    )
    .toBeLessThan(1);
}

for (const reduced of [false, true]) {
  test(`navigation motion preserves work and honors reduced motion: ${reduced}`, async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const profiles = await (await request.get("/api/v1/reference/profiles")).json();
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `MOTION-${crypto.randomUUID().slice(0, 8)}`,
        title: "Synthetic navigation review",
        procedure: profiles[0].code,
      },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = await created.json();
    const root = `/api/v1/cases/${id}/review`;
    const original = (await (await request.get(root)).json()).workspace;
    const writes: string[] = [];
    page.on("request", (req) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method())) writes.push(req.url());
    });
    await page.goto(`/cases/${id}/review?section=compare`);
    const search = page.getByLabel(vi.integration.findField);
    await search.fill("unsaved search");
    const tabs = page.locator(".review-tabs");
    const workbench = page.locator(".review-workbench");
    await workbench.evaluate((element) => element.setAttribute("data-preserved", "true"));
    await tabs.getByRole("button", { name: vi.review.canonical, exact: true }).click();
    await tabs.getByRole("button", { name: vi.review.export, exact: true }).click();
    await tabs.getByRole("button", { name: vi.review.compare, exact: true }).click();
    await expect(search).toHaveValue("unsaved search");
    await expect(workbench).toHaveAttribute("data-preserved", "true");
    await expectIndicatorAligned(tabs);

    // The indicator follows wrapped rows as well as horizontal tabs.
    await page.setViewportSize({ width: 390, height: 844 });
    await expectIndicatorAligned(tabs);
    await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
    await expectIndicatorAligned(tabs);
    await page.getByRole("combobox", { name: en.app.language }).selectOption("vi");
    await expectIndicatorAligned(tabs);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await (await request.get(root)).json()).workspace).toEqual(original);
    expect(writes).toEqual([]);

    await expect(page.locator("main")).toHaveAttribute("data-motion-engine", "framer-motion");
    if (!reduced) {
      // Assert actual content movement and cancellation, not an animation class name.
      await tabs.getByRole("button", { name: vi.review.canonical, exact: true }).click();
      await expect(page.locator("main")).toHaveAttribute("data-motion-state", "running");
      const content = page.locator(".review-fieldset > section").first();
      await expect
        .poll(() =>
          content.evaluate((element) =>
            Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41),
          ),
        )
        .toBeGreaterThan(2);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator("main")).toHaveAttribute("data-motion-state", "idle");
      await expect
        .poll(() =>
          content.evaluate((element) =>
            Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41),
          ),
        )
        .toBe(0);
    }
    await tabs.getByRole("button", { name: vi.review.documents, exact: true }).click();
    await expect(page.locator("main")).toHaveAttribute("data-motion-state", "idle");
    expect(errors).toEqual([]);
  });
}

test("landing steps animate without remounting and keep keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const panel = page.getByRole("tabpanel");
  await panel.evaluate((element) => element.setAttribute("data-preserved", "true"));
  const second = page.getByRole("tab").nth(1);
  await second.click();
  await expect(panel).toHaveAttribute("data-preserved", "true");
  await expect(panel).toContainText(vi.studioLanding.steps[1]!.detail);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab").nth(2)).toBeFocused();
  await expect(panel).toContainText(vi.studioLanding.steps[2]!.detail);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel).toHaveAttribute("data-motion-state", "idle");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab").first()).toBeFocused();
  await expect(panel).toContainText(vi.studioLanding.steps[0]!.detail);
  await expect(panel).toHaveAttribute("data-motion-state", "idle");
});

test("workspace rows visibly stagger and respond to hover without changing records", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  for (let index = 0; index < 3; index++) {
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `MOTION-ROW-${crypto.randomUUID().slice(0, 8)}`,
        title: `Motion register ${index + 1}`,
        procedure: profiles[0].code,
      },
    });
    expect(created.ok()).toBeTruthy();
  }
  await page.addInitScript(() => {
    const samples: number[] = [];
    Object.assign(window, { motionRowSamples: samples });
    const start = performance.now();
    function sample() {
      const row = document.querySelector(".register-table tbody tr");
      if (row) samples.push(new DOMMatrixReadOnly(getComputedStyle(row).transform).m42);
      if (performance.now() - start < 2500) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.goto("/cases");
  const first = page.locator(".register-table tbody tr").first();
  await expect(first).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(0, ...(window as unknown as { motionRowSamples: number[] }).motionRowSamples),
      ),
    )
    .toBeGreaterThan(8);
  await expect
    .poll(() =>
      first.evaluate((element) =>
        Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42),
      ),
    )
    .toBeLessThan(0.1);
  const before = await (await request.get("/api/v1/cases?limit=100")).json();
  await first.hover();
  await expect
    .poll(() =>
      first.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41),
    )
    .toBeGreaterThan(4);
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      first.evaluate((element) =>
        Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41),
      ),
    )
    .toBeLessThan(0.1);
  expect(await (await request.get("/api/v1/cases?limit=100")).json()).toEqual(before);
});
