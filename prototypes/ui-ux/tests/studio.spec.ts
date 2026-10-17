import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const designs = ['harbor', 'control', 'ledger'];
const screens = ['overview', 'documents', 'reconcile', 'consolidation', 'review'];

test('gallery offers three working concepts and comparison', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'HỆ THỐNG KIỂM TRA TRƯỚC KHAI BÁO HẢI QUAN',
  );
  await expect(page.locator('.concept-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'So sánh các phương án' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Trải nghiệm Harbor' }).click();
  await expect(page).toHaveURL(/design=harbor/);
});

for (const design of designs) {
  test(`${design}: five screens render at desktop and laptop sizes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    for (const width of [1440, 1366]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
      for (const screen of screens) {
        await page.goto(`/?design=${design}&screen=${screen}&case=hardware`);
        await expect(page.locator('.page-heading h1')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
        if (width === 1440) {
          fs.mkdirSync('test-results/previews', { recursive: true });
          await page.screenshot({
            path: `test-results/previews/${design}-${screen}.png`,
            fullPage: true,
            animations: 'disabled',
          });
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

test('switching concept preserves current shipment, screen and edits', async ({ page }) => {
  await page.goto('/?design=harbor&screen=consolidation&case=silica');
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('Silica gel — đã bổ sung mô tả thử');
  await page.getByRole('button', { name: 'B Control', exact: true }).click();
  await expect(page).toHaveURL(/design=control&screen=consolidation&case=silica/);
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })).toHaveValue(
    'Silica gel — đã bổ sung mô tả thử',
  );
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })).toHaveValue(
    'Silica gel — đã bổ sung mô tả thử',
  );
});

test('blocking source error stays open after a verification note', async ({ page }) => {
  await page.goto('/?design=control&screen=reconcile&case=hardware');
  await page
    .getByLabel('Ghi chú xác minh')
    .fill('Đã đề nghị bên phát hành kiểm tra tổng số lượng.');
  await page.getByRole('button', { name: 'Lưu yêu cầu xác minh' }).click();
  await expect(page.locator('.saved-note')).toContainText('vấn đề vẫn mở');
  await page.locator('.workspace-nav').getByRole('button', { name: 'Rà soát' }).click();
  await expect(page.getByRole('button', { name: 'Xuất Excel', exact: true })).toBeDisabled();
  await expect(page.getByText('Chưa kết nối dịch vụ kiểm tra và xuất Excel').first()).toBeVisible();
});

test('valid unit conversion has evidence and no source error action', async ({ page }) => {
  await page.goto('/?design=harbor&screen=reconcile&case=hardware');
  await page.getByRole('combobox', { name: 'Lọc kết quả đối chiếu' }).click();
  await page.getByRole('option', { name: /^Khớp/ }).click();
  await expect(page.locator('.issue-detail h2')).toHaveText('Quy đổi đóng gói phù hợp');
  await expect(page.locator('.value-comparison')).toContainText('10 pallet × 20 carton');
  await expect(page.locator('.issue-detail')).not.toContainText('Lỗi chặn');
});

test('sample data cannot authorize a real Excel export', async ({ page }) => {
  await page.goto('/?design=ledger&screen=review&case=silica');
  await expect(page.getByRole('button', { name: 'Xuất Excel', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tải báo cáo mô phỏng' })).toHaveCount(0);
  await expect(page.locator('.workspace-nav')).not.toContainText('HS');
  await expect(page.locator('.workspace-nav')).toContainText('Tổng hợp');
});

test('six result categories distinguish missing, incomparable and uncertain values', async ({
  page,
}) => {
  await page.goto('/?design=control&screen=reconcile&case=silica');
  await page.getByRole('combobox', { name: 'Lọc kết quả đối chiếu' }).click();
  await expect(page.getByRole('option')).toHaveCount(7);
  await page.getByRole('option', { name: /^Không đủ nguồn để so sánh/ }).click();
  await expect(page.locator('.issue-detail')).toContainText('Chỉ có một nguồn');
  await page.goto('/?design=control&screen=reconcile&case=durian');
  await expect(page.locator('.issue-detail')).toContainText('Thiếu dữ liệu bắt buộc');
});

test('search, file staging, theme editing and feedback are interactive', async ({ page }) => {
  await page.goto('/?design=harbor&screen=overview&case=hardware');
  await page.getByRole('textbox', { name: 'Tìm hồ sơ' }).fill('Vật liệu B');
  await expect(page.locator('.case-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mở hồ sơ Doanh nghiệp Vật liệu B' }).click();
  await page.locator('.workspace-nav').getByRole('button', { name: 'Bộ chứng từ' }).click();
  await page.getByLabel('Thêm chứng từ').setInputFiles({
    name: 'invoice-demo.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 example'),
  });
  await expect(page.locator('.local-uploads')).toContainText('invoice-demo.pdf');
  await expect(page.locator('.local-uploads')).toContainText('Chờ kết nối AI');
  await page.getByRole('button', { name: 'Tùy chỉnh', exact: true }).click();
  await page.getByRole('textbox', { name: 'Màu chủ đạo', exact: true }).fill('#6341b2');
  await page.getByRole('button', { name: 'Xem giao diện', exact: true }).click();
  expect(
    await page
      .locator('.theme-root')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--accent')),
  ).toBe('#6341b2');
  await page.getByRole('button', { name: 'Góp ý', exact: true }).click();
  await page.getByRole('button', { name: 'Dễ hiểu cách sử dụng: 5 điểm', exact: true }).click();
  await page
    .getByLabel('Điều bạn muốn giữ hoặc thay đổi')
    .fill('Giữ bố cục thoáng và cách xem bằng chứng.');
  await page.getByRole('checkbox', { name: 'Đánh dấu là một hướng yêu thích' }).check();
  await page.getByRole('button', { name: 'Lưu góp ý', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Góp ý', exact: true }).click();
  await expect(page.getByLabel('Điều bạn muốn giữ hoặc thay đổi')).toHaveValue(
    'Giữ bố cục thoáng và cách xem bằng chứng.',
  );
});

test('all layouts retain navigation and fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const design of designs) {
    for (const screen of screens) {
      await page.goto(`/?design=${design}&screen=${screen}&case=hardware`);
      await expect(page.locator('.workspace-nav')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
  }
});

test('capture comparison gallery', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync('test-results/previews', { recursive: true });
  await page.screenshot({
    path: 'test-results/previews/00-gallery.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('reference-only shipments do not fabricate source documents or allow approval', async ({
  page,
}) => {
  await page.goto('/?design=control&screen=reconcile&case=durian');
  await expect(page.locator('.source-viewer .empty-state')).toContainText(
    'Chưa có bộ chứng từ đầu vào',
  );
  await expect(page.locator('.document-paper')).toHaveCount(0);
  await page.locator('.workspace-nav').getByRole('button', { name: 'Rà soát' }).click();
  await expect(page.getByRole('button', { name: 'Xuất Excel', exact: true })).toBeDisabled();
});

test('reconciliation has no clipped navigation or nested document scrollbars', async ({ page }) => {
  for (const design of designs) {
    for (const viewport of [
      { width: 1920, height: 870 },
      { width: 1440, height: 768 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 768, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/?design=${design}&screen=reconcile&case=silica`);
      await page.evaluate(() => document.fonts.ready);
      for (const selector of ['.sidebar', '.paper-scroll']) {
        const regions = await page.locator(selector).evaluateAll((elements) =>
          elements.map((element) => ({
            horizontal: element.scrollWidth > element.clientWidth + 1,
            vertical: element.scrollHeight > element.clientHeight + 1,
          })),
        );
        for (const region of regions) {
          expect(region, `${design} ${viewport.width} ${selector}`).toEqual({
            horizontal: false,
            vertical: false,
          });
        }
      }
      await expect(page.locator('.workspace-nav button')).toHaveCount(5);
      await page.locator('.workspace-nav button').last().click();
      await expect(page).toHaveURL(/screen=review/);
    }
  }
});

test('Harbor keeps evidence readable with larger UI, collapsed navigation and source zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?design=harbor&screen=reconcile&case=silica');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1.25';
  });
  const sidebar = page.locator('.sidebar');
  const fits = () =>
    sidebar.evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1,
    );
  expect(await fits()).toBeTruthy();
  await page.getByRole('button', { name: 'Thu gọn hoặc mở thanh điều hướng' }).click();
  expect(await fits()).toBeTruthy();
  await page.getByRole('button', { name: 'Thu gọn hoặc mở thanh điều hướng' }).click();
  for (let step = 0; step < 3; step++) {
    await page.getByRole('button', { name: 'Phóng to chứng từ', exact: true }).click();
  }
  await expect(page.locator('.source-toolbar')).toContainText('130%');
  expect(
    await page
      .locator('.paper-scroll')
      .evaluate(
        (el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1,
      ),
  ).toBeTruthy();
  await page.getByLabel('Ghi chú xác minh').fill('Đã kiểm tra tình huống mẫu.');
  await expect(page.getByRole('button', { name: 'Ghi nhận xác minh' })).toBeEnabled();
  await page.screenshot({
    path: 'test-results/previews/harbor-silica-zoom125.png',
    fullPage: true,
  });
});

test('custom menus support keyboard selection, dialog focus and live theme changes', async ({
  page,
}) => {
  await page.goto('/?design=harbor&screen=reconcile&case=silica');
  const casesMenu = page.getByRole('combobox', { name: 'ĐANG XEM HỒ SƠ' });
  await casesMenu.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('option', { name: /Vật liệu B/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: /Cơ khí A/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/case=hardware/);
  await expect(casesMenu).toBeFocused();
  await casesMenu.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(casesMenu).toBeFocused();
  await page.getByRole('button', { name: 'Tùy chỉnh', exact: true }).click();
  const radiusMenu = page.getByRole('combobox', { name: 'Bo góc', exact: true });
  await radiusMenu.click();
  await page.getByRole('option', { name: 'Mềm · 16px', exact: true }).click();
  expect(
    await page
      .locator('.theme-root')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--radius')),
  ).toBe('16px');
  await radiusMenu.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(radiusMenu).toBeFocused();
  await expect(page.locator('select:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Màu chủ đạo · Control', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Màu chủ đạo', exact: true })).toHaveValue(
    '#4655df',
  );
  await page.getByRole('button', { name: 'Xem giao diện', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reduced-motion preference disables workspace and menu transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?design=harbor&screen=reconcile&case=silica');
  await page.getByRole('combobox', { name: 'ĐANG XEM HỒ SƠ' }).click();
  for (const selector of ['.select-menu', '.issue-detail', '.select-chevron']) {
    const styles = await page.locator(selector).evaluateAll((elements) =>
      elements.map((el) => ({
        animation: getComputedStyle(el).animationName,
        transition: getComputedStyle(el).transitionDuration,
      })),
    );
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) expect(style).toEqual({ animation: 'none', transition: '0s' });
  }
});
