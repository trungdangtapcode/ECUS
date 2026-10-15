import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const gatewayUrl = process.env.REVIEW_GATEWAY_BASE_URL;
const accessFile = process.env.REVIEW_ACCESS_FILE;

test("review gateway protects the UI and API while authenticated browsing works", async ({
  browser,
  playwright,
}) => {
  test.skip(!gatewayUrl || !accessFile, "Run against the optional isolated review gateway.");
  const access = JSON.parse(readFileSync(accessFile!, "utf8")) as {
    username: string;
    password: string;
  };
  const anonymous = await playwright.request.newContext({ baseURL: gatewayUrl });
  const invalid = await playwright.request.newContext({
    baseURL: gatewayUrl,
    httpCredentials: { username: "invalid", password: "invalid", send: "always" },
  });
  const authorized = await playwright.request.newContext({
    baseURL: gatewayUrl,
    httpCredentials: { username: access.username, password: access.password, send: "always" },
  });
  const context = await browser.newContext({
    httpCredentials: { username: access.username, password: access.password },
  });
  try {
    for (const path of ["/", "/cases", "/api/v1/health/ready", "/api/v1/cases"]) {
      expect((await anonymous.get(path)).status()).toBe(401);
      expect((await invalid.get(path)).status()).toBe(401);
    }
    expect((await anonymous.post("/api/v1/cases", { data: {} })).status()).toBe(401);
    expect((await authorized.get("/api/v1/health/ready")).status()).toBe(200);
    expect((await authorized.get("/api/v1/cases")).status()).toBe(200);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const casesLoaded = page.waitForResponse(
      (response) => response.url().includes("/api/v1/cases") && response.status() === 200,
    );
    await page.goto(`${gatewayUrl}/cases`);
    await casesLoaded;
    await expect(page.locator("body")).toContainText(/precheck/i);
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([
      anonymous.dispose(),
      invalid.dispose(),
      authorized.dispose(),
      context.close(),
    ]);
  }
});
