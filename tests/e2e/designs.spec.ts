import { expect, test } from "@playwright/test";
import vi from "../../apps/web/src/locales/vi.json";

for (const width of [1440, 1366, 390]) {
  test(`approved Harbor landing and workspace at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator(".landing-harbor")).toBeVisible();
    await expect(page.locator(".landing-port img")).toBeVisible();
    await page.getByRole("tab").nth(2).click();
    await expect(page.getByRole("tabpanel")).toContainText(vi.studioLanding.steps[2]!.detail);
    await page.getByRole("button", { name: vi.studioLanding.primary, exact: true }).click();
    await expect(page).toHaveURL(/\/cases$/);
    await expect(
      page.getByRole("heading", { name: vi.harborApp.overview, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".cover-harbor")).toBeVisible();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole("button", { name: vi.design.customize, exact: true })).toHaveCount(
      0,
    );
    if (width > 1100) {
      await page.getByRole("button", { name: vi.harborApp.collapse }).click();
      await expect(page.locator(".workspace")).toHaveClass(/nav-collapsed/);
      await page.getByRole("button", { name: vi.harborApp.collapse }).click();
      await page.getByRole("button", { name: vi.harborApp.help, exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText(vi.harborApp.helpSteps[0]!);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

for (const legacy of ["control", "ledger"]) {
  test(`legacy ${legacy} links and saved customization resolve to Harbor`, async ({ page }) => {
    await page.addInitScript((selected) => {
      localStorage.setItem(
        "ecus.design.v1",
        JSON.stringify({
          version: 1,
          selected,
          overrides: { harbor: { accent: "#ff0000", radius: 24 } },
        }),
      );
    }, legacy);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url());
    });
    await page.goto(`/cases?design=${legacy}`);
    await expect(page).toHaveURL(/\/cases$/);
    await expect(page.locator(".design-root")).toHaveAttribute("data-design", "harbor");
    expect(
      await page
        .locator(".design-root")
        .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim()),
    ).toBe("#26766b");
    await page.getByRole("button", { name: vi.cases.create, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: /[ABC] — / })).toHaveCount(0);
    await page
      .getByRole("textbox", { name: vi.cases.name, exact: true })
      .fill("Unsaved Harbor case");
    await expect(page.getByRole("dialog").locator('input[name="title"]')).toHaveValue(
      "Unsaved Harbor case",
    );
    expect(writes).toEqual([]);
  });
}
