import { expect, test } from "@playwright/test";
import en from "../../apps/web/src/locales/en.json";
import vi from "../../apps/web/src/locales/vi.json";

test("creates a persistent case through the API and switches interface locale", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cases");
  await page.getByRole("combobox", { name: vi.app.language }).selectOption("en");
  await expect(page.getByRole("heading", { name: en.harborApp.overview })).toBeVisible();
  await page.getByRole("button", { name: en.cases.create, exact: true }).click();
  const reference = `E2E-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: en.cases.reference, exact: true }).fill(reference);
  await dialog
    .getByRole("textbox", { name: en.cases.name, exact: true })
    .fill("Integration test shipment");
  const response = await request.get("/api/v1/reference/profiles");
  const profiles = (await response.json()) as { code: string }[];
  expect(profiles.length).toBeGreaterThan(0);
  await dialog.getByRole("combobox", { name: en.cases.procedure }).selectOption(profiles[0]!.code);
  await dialog.getByRole("button", { name: en.cases.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/cases\/[a-f0-9-]+$/);
  await expect(page.getByRole("heading", { name: "Integration test shipment" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Integration test shipment" })).toBeVisible();
  await page.getByRole("link", { name: en.common.back }).click();
  await expect(
    page.getByRole("link", { name: en.cases.open.replace("{{reference}}", reference) }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: en.app.language }).selectOption("vi");
  await expect(page.getByRole("heading", { name: vi.harborApp.overview })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  expect(errors).toEqual([]);
});

test("shows an actionable service error instead of an empty case register", async ({ page }) => {
  await page.route("**/api/v1/cases?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "database_unavailable",
          message: "Service unavailable",
          request_id: "test-request",
        },
      }),
    }),
  );
  await page.goto("/cases");
  await expect(page.getByRole("alert")).toContainText(vi.errors.database_unavailable);
  await expect(page.getByRole("button", { name: vi.common.retry })).toBeVisible();
});
