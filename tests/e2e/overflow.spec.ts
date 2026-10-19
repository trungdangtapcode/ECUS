import { expect, test } from "@playwright/test";
import vi from "../../apps/web/src/locales/vi.json";

test("Register animations stay within the table while narrow tables remain scrollable", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const profiles = await (await request.get("/api/v1/reference/profiles")).json();
  for (const [index, title] of [
    "Synthetic register",
    "S".repeat(180),
    "Archived register",
  ].entries()) {
    const created = await request.post("/api/v1/cases", {
      data: {
        reference: `OVERFLOW-${crypto.randomUUID().slice(0, 8)}`,
        title,
        procedure: profiles[0].code,
      },
    });
    expect(created.ok()).toBe(true);
    if (index === 2) {
      const { id } = await created.json();
      const archived = await request.put(`/api/v1/cases/${id}/archive`, {
        data: { archived: true },
      });
      expect(archived.ok()).toBe(true);
    }
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const samples: { horizontal: number; vertical: number; page: number }[] = [];
    Object.assign(window, { overflowSamples: samples });
    function sample() {
      const scroller = document.querySelector(".register-scroll");
      if (scroller) {
        samples.push({
          horizontal: scroller.scrollWidth - scroller.clientWidth,
          vertical: scroller.scrollHeight - scroller.clientHeight,
          page: document.documentElement.scrollWidth - innerWidth,
        });
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  for (const width of [1600, 1440, 1366, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const archived of [false, true]) {
      await page.goto(`/cases${archived ? "?view=archived" : ""}`);
      const rows = page.locator(".register-table tbody tr");
      await expect(rows.first()).toBeVisible();
      await expect(page.locator("main")).toHaveAttribute("data-motion-state", "idle");
      // Entry animations may still be running after the page-level reveal finishes.
      await expect
        .poll(() =>
          rows.evaluateAll((items) =>
            items.every((row) => Number(getComputedStyle(row).opacity) === 1),
          ),
        )
        .toBe(true);
      const scroll = page.locator(".register-scroll");
      const initial = await scroll.evaluate((element) => ({
        horizontal: element.scrollWidth - element.clientWidth,
        vertical: element.scrollHeight - element.clientHeight,
      }));
      if (width >= 1280) expect(initial.horizontal, `${width}px desktop table`).toBe(0);
      expect(initial.vertical).toBe(0);
      for (const row of [rows.first(), rows.last()]) {
        await row.hover();
        await expect
          .poll(() =>
            row
              .locator(".register-open svg")
              .evaluate(
                (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
              ),
          )
          .toBeGreaterThan(2);
        expect(await scroll.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(
          initial.horizontal,
        );
        await row.locator(".register-case-name").focus();
      }
      if (width <= 768) {
        await scroll.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        expect(await scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        await expect(rows.last().locator(".register-open")).toBeInViewport();
        await scroll.evaluate((element) => {
          element.scrollLeft = 0;
        });
      }
      if (!archived) {
        const search = page.locator(".register-search input");
        await search.fill("Synthetic register");
        await expect(rows).toHaveCount(1);
        await search.fill("");
        await expect(rows).not.toHaveCount(1);
      }
      const samples = await page.evaluate(
        () =>
          (
            window as unknown as {
              overflowSamples: { horizontal: number; vertical: number; page: number }[];
            }
          ).overflowSamples,
      );
      expect(samples.length).toBeGreaterThan(0);
      expect(Math.max(...samples.map((item) => item.page))).toBe(0);
      expect(Math.max(...samples.map((item) => item.vertical))).toBe(0);
      expect(Math.max(...samples.map((item) => item.horizontal))).toBeLessThanOrEqual(
        initial.horizontal,
      );
      await page.mouse.move(0, 0);
    }
  }
  // An English date and longer status label must also fit on desktop.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/cases");
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  await expect(page.locator(".register-table tbody tr").first()).toBeVisible();
  expect(
    await page
      .locator(".register-scroll")
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBe(0);
  expect(errors).toEqual([]);
});
