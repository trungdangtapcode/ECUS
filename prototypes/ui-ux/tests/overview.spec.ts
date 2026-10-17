import { expect, test } from '@playwright/test';

const designs = ['harbor', 'control', 'ledger'];

test('overview filters, search and shipment actions work in each presentation', async ({
  page,
}) => {
  for (const design of designs) {
    await page.goto(`/?design=${design}&screen=overview&case=hardware`);
    const rows = page.locator('.case-table tbody tr');
    await expect(rows).toHaveCount(3);
    await page.getByRole('button', { name: 'Xuất khẩu', exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('B11');
    await page.getByRole('textbox', { name: 'Tìm hồ sơ', exact: true }).fill('Vật liệu B');
    await expect(page.getByText('Không có hồ sơ phù hợp', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await expect(rows).toHaveCount(3);
    await page.getByRole('textbox', { name: 'Tìm hồ sơ', exact: true }).fill('Vật liệu B');
    await expect(rows).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Mở hồ sơ Doanh nghiệp Vật liệu B', exact: true })
      .click();
    await expect(page).toHaveURL(/screen=reconcile&case=silica/);
  }
});

test('overview fits desktop and mobile while keeping wide data inside the table', async ({
  page,
}) => {
  for (const design of designs) {
    for (const width of [1920, 1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/?design=${design}&screen=overview&case=hardware`);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${design} ${width}`,
      ).toBeTruthy();
      await expect(page.getByRole('textbox', { name: 'Tìm hồ sơ', exact: true })).toBeVisible();
      if (width === 390) {
        const table = page.locator('.register-scroll');
        await table.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        await page
          .getByRole('button', { name: 'Mở hồ sơ Doanh nghiệp Cơ khí A', exact: true })
          .click();
        await expect(page).toHaveURL(/screen=reconcile&case=hardware/);
      }
    }
  }
});
