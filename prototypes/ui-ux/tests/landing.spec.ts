import { expect, test } from '@playwright/test';
import vi from '../../../apps/web/src/locales/vi.json' with { type: 'json' };
import { mkdirSync } from 'node:fs';

const text = vi.studioLanding;
for (const design of ['harbor', 'control', 'ledger']) {
  test(`${design} landing supports sample exploration, keyboard steps and workspace entry`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?design=${design}&screen=landing&case=silica`);
    await expect(page.locator('.landing')).toBeVisible();
    await expect(page.locator('.landing-demo-note')).toHaveText(text.demoNote);
    const firstStep = page.getByRole('tab').first();
    await firstStep.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tabpanel')).toContainText(text.steps[1].detail);
    await page.keyboard.press('End');
    await expect(page.getByRole('tabpanel')).toContainText(text.steps[4].description);
    await page.locator('.landing-sample-choices button').nth(1).click();
    await expect(page.locator('.landing-evidence')).toContainText('Doanh nghiệp Vật liệu B');
    await page.getByRole('button', { name: text.exampleAction }).click();
    await expect(page).toHaveURL(new RegExp(`design=${design}&screen=reconcile&case=silica`));
    await expect(page.locator('.issue-detail')).toBeVisible();
    await page.getByRole('button', { name: text.landing, exact: true }).click();
    await expect(page.locator('.landing')).toBeVisible();
    await page.getByRole('button', { name: text.primary }).click();
    await expect(page).toHaveURL(/screen=overview&case=silica/);
    await expect(page.locator('.cover-case')).toContainText('Doanh nghiệp Vật liệu B');
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(errors).toEqual([]);
  });

  test(`${design} landing fits desktop and mobile with local assets`, async ({ page }) => {
    const failures: string[] = [];
    page.on('requestfailed', (request) => failures.push(request.url()));
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?design=${design}&screen=landing`);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: text.primary })).toBeVisible();
      expect(
        await page
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      ).toBe(true);
      mkdirSync('test-results/previews', { recursive: true });
      await page.screenshot({
        path: `test-results/previews/${design}-landing-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
    expect(failures).toEqual([]);
  });
}

test('landing stays selected while switching designs and respects reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?design=harbor&screen=landing&case=silica');
  await page.getByRole('button', { name: 'B Control', exact: true }).click();
  await expect(page).toHaveURL(/design=control&screen=landing&case=silica/);
  expect(
    await page.locator('.landing-aurora').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.reload();
  await expect(page.locator('.landing-control')).toBeVisible();
  await page.getByRole('button', { name: 'C Ledger', exact: true }).click();
  await expect(page.locator('.landing-ledger')).toBeVisible();
  await page.getByRole('button', { name: text.gallery }).click();
  await page.locator('.concept-control').getByRole('button', { name: text.viewLanding }).click();
  await expect(page.locator('.landing-control')).toBeVisible();
});
