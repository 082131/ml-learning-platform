import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/runtimes/onnx-serving';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ONNX, ONNX Runtime');
});

test('changing the optimization level and batch updates the graph and the traffic', async ({ page }) => {
  const viz = page.locator('[data-onnx-kernels]').first();
  await expect(viz).toHaveAttribute('data-onnx-kernels', '9');
  await expect(viz).toHaveAttribute('data-onnx-bytes', '10528');

  const controls = page.locator('[data-experiment="onnx"]').filter({ has: page.getByRole('slider') });
  await controls.getByRole('combobox', { name: 'Graph optimization level' }).selectOption('extended');
  await expect(viz).toHaveAttribute('data-onnx-kernels', '4');
  await expect(viz).toContainText('FusedGemm');
  await expect(viz).toHaveAttribute('data-onnx-bytes', '720');

  const batch = controls.getByRole('slider', { name: 'Batch size' });
  await batch.focus();
  await page.keyboard.press('End');
  await expect(viz).toHaveAttribute('data-onnx-bytes', String(8 * 90 * 512));
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('(33%)');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="onnx-session"] [class*="kw"]').first().waitFor();
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
