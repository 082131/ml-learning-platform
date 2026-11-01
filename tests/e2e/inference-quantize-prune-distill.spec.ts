import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/compression/quantize-prune-distill';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Quantization, pruning and distillation');
});

test('changing sparsity and scope updates the chart, the mask, the code and the printout together', async ({ page }) => {
  const viz = page.locator('[data-prune-correct]').first();
  await expect(viz).toHaveAttribute('data-prune-correct', '317');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('kept 512 of 1024 in W1, 80 of 160 in W2');

  const controls = page.locator('[data-experiment="prune"]').filter({ has: page.getByRole('slider') });
  const sparsity = controls.getByRole('slider', { name: 'Sparsity (% of weights zeroed)' });
  await sparsity.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight'); // 80%
  await expect(printout).toContainText('correct: 201 of 360');
  await controls.getByRole('combobox', { name: 'Threshold' }).selectOption('global');
  await expect(printout).toContainText('kept 166 of 1024 in W1, 71 of 160 in W2');
  await expect(viz).toHaveAttribute('data-prune-correct', '244');
  await expect(page.locator('[data-code-example="prune-numpy"]').first()).toContainText('sparsity = 0.80');
});

test('raising the temperature softens the teacher outputs', async ({ page }) => {
  const soft = page.locator('[data-soft-top]').first();
  await expect(soft).toHaveAttribute('data-soft-top', '0.600');
  const t = page.locator('[data-experiment="temperature"]').getByRole('slider', { name: 'Temperature T' });
  await t.focus();
  await page.keyboard.press('Home');
  await expect(soft).toHaveAttribute('data-soft-top', '0.989');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="prune-numpy"] [class*="kw"]').first().waitFor();
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
