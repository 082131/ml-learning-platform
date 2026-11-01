import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/basics/what-is-inference';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Inference vs training');
});

test('changing the optimizer and batch updates the bars, the code and the printout together', async ({ page }) => {
  const viz = page.locator('[data-train-memory]').first();
  await expect(viz).toHaveAttribute('data-infer-memory', String(4 * 669_706 + 4 * 64 * 1296));
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('training memory       10.91 MiB');

  const controls = page.locator('[data-experiment="train-infer"]').filter({ has: page.getByRole('slider') });
  await controls.getByRole('combobox', { name: 'Optimizer (training only)' }).selectOption('sgd');
  await expect(printout).toContainText('training memory        5.80 MiB');
  await expect(page.locator('[data-code-example="train-infer-estimate"]').first()).toContainText(
    'batch, optimizer = 64, "sgd"',
  );

  const batch = controls.getByRole('slider', { name: 'Batch size' });
  await batch.focus();
  await page.keyboard.press('Home');
  await expect(printout).toContainText('inference memory       2.56 MiB');
  await expect(viz).toHaveAttribute('data-infer-memory', String(4 * 669_706 + 4 * 1296));
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="train-infer-estimate"] [class*="kw"]').first().waitFor();
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
