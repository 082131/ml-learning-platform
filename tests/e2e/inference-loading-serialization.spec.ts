import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/runtime/loading-serialization';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Loading, serialization');
});

test('changing the checkpoint updates the byte layout, the save code and the inspect printout', async ({ page }) => {
  const viz = page.locator('[data-file-bytes]').first();
  await expect(viz).toHaveAttribute('data-file-bytes', '5120');
  await expect(viz).toHaveAttribute('data-load-ok', 'true');
  const printout = page.getByRole('region', { name: 'What inspect.py prints' });
  await expect(printout).toContainText('header bytes: 272');

  const controls = page.locator('[data-experiment="checkpoint"]').filter({ has: page.getByRole('combobox') }).last();
  await controls.getByRole('combobox', { name: 'Checkpoint' }).selectOption('prefix');
  await expect(viz).toHaveAttribute('data-load-ok', 'false');
  await expect(printout).toContainText('header bytes: 304');
  await expect(printout).toContainText("unexpected:  ['module.fc1.bias'");
  await expect(page.locator('[data-code-example="checkpoint-save"]').first()).toContainText('"module.fc1.weight"');

  await controls.getByRole('combobox', { name: 'Checkpoint' }).selectOption('match');
  await controls.getByRole('combobox', { name: 'Stored dtype' }).selectOption('float16');
  await expect(viz).toHaveAttribute('data-load-ok', 'true');
  await expect(viz).toHaveAttribute('data-file-bytes', String(8 + 272 + 2420));
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="checkpoint-save"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
      [],
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
