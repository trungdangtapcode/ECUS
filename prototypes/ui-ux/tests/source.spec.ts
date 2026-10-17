import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const vi = JSON.parse(readFileSync('../../apps/web/src/locales/vi.json', 'utf8'));

const content = execFileSync(
  'uv',
  [
    'run',
    '--project',
    'services/api',
    'python',
    '-c',
    "import runpy,sys; d=runpy.run_path('services/api/tests/test_review.py'); sys.stdout.buffer.write(d['pdf_bytes'](['SOURCE CHECK 21000']))",
  ],
  { cwd: '../..' },
);

test('original PDF shows real text positions and does not fabricate a missing highlight', async ({
  page,
}) => {
  await page.goto('/?design=control&screen=reconcile&case=hardware');
  await page
    .getByLabel(vi.workbench.connectOriginal)
    .setInputFiles({ name: 'synthetic-source.pdf', mimeType: 'application/pdf', buffer: content });
  await expect(page.getByLabel(vi.workbench.originalView)).toBeVisible();
  await page.getByLabel(vi.workbench.searchSource).fill('21000');
  await expect(page.locator('.original-source-position')).toContainText(vi.workbench.matches);
  await expect(page.locator('.original-source-position')).toContainText('x=40');
  await page.getByLabel(vi.workbench.searchSource).fill('DOES NOT EXIST');
  await expect(page.locator('.original-source-position')).toContainText(vi.workbench.noTextMatch);
  await page.getByRole('button', { name: 'A Harbor', exact: true }).click();
  await expect(page.locator('.original-source-position')).toContainText('synthetic-source.pdf');
  await page.locator('.workspace-nav button').last().click();
  await expect(
    page.getByRole('button', { name: vi.workbench.exportExcel, exact: true }),
  ).toBeDisabled();
});

test('one physical PDF exposes its three logical documents and source pages', async ({ page }) => {
  await page.goto('/?design=control&screen=documents&case=silica');
  const group = page
    .locator('.physical-document-group')
    .filter({ hasText: 'demo-material-documents.pdf' });
  await expect(group.locator('.document-row')).toHaveCount(3);
  await expect(group).toContainText('Sales Contract');
  await expect(group).toContainText('Commercial Invoice');
  await expect(group).toContainText('Packing List');
  await group.getByRole('button', { name: /Sales Contract/ }).click();
  await expect(page.getByRole('dialog').locator('.evidence-identity')).toContainText('1–1');
});
