import { expect, test } from '@playwright/test';

const designs = ['harbor', 'control', 'ledger'];

test('canonical values, source selections and reasons survive theme changes and reload', async ({
  page,
}) => {
  await page.goto('/?design=control&screen=consolidation&case=hardware');
  const field = page.getByRole('region', { name: 'Mô tả hàng hóa', exact: true });
  await field
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('Thanh trượt đồ gỗ — kiểm tra giao diện');
  await field.getByRole('combobox').click();
  await page.getByRole('option', { name: /Commercial Invoice/ }).click();
  await field
    .getByRole('textbox', { name: 'Lý do lựa chọn hoặc chỉnh sửa', exact: true })
    .fill('Chọn theo chứng từ mẫu để thử giao diện.');
  await field.getByRole('button', { name: 'Xem nguồn', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.document-paper')).toContainText(
    'COMMERCIAL INVOICE',
  );
  await page.keyboard.press('Escape');
  await expect(field.getByRole('button', { name: 'Xem nguồn', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'A Harbor', exact: true }).click();
  await page.reload();
  await expect(field.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })).toHaveValue(
    'Thanh trượt đồ gỗ — kiểm tra giao diện',
  );
  await expect(field.getByRole('combobox')).toContainText('Commercial Invoice');
  await expect(
    field.getByRole('textbox', { name: 'Lý do lựa chọn hoặc chỉnh sửa', exact: true }),
  ).toHaveValue('Chọn theo chứng từ mẫu để thử giao diện.');
  await field.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Chưa chọn nguồn', exact: true }).click();
  await expect(field.getByRole('combobox')).toContainText('Chưa chọn nguồn');
  await expect(field.getByRole('button', { name: 'Xem nguồn', exact: true })).toBeDisabled();
  await expect(
    field.getByRole('textbox', { name: 'Lý do lựa chọn hoặc chỉnh sửa', exact: true }),
  ).not.toBeEmpty();
});

test('canonical register and evidence index work across desktop and mobile themes', async ({
  page,
}) => {
  for (const design of designs) {
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/?design=${design}&screen=consolidation&case=hardware`);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${design} ${width}`,
      ).toBeTruthy();
      await page.getByRole('textbox', { name: 'Số lượng', exact: true }).fill('1000');
      await page
        .getByRole('button', { name: 'Xem nguồn: Commercial Invoice', exact: true })
        .click();
      await expect(page.getByRole('dialog').locator('.document-paper')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.locator('.canonical-review-button').click();
      await expect(page).toHaveURL(/screen=review/);
    }
  }
});
