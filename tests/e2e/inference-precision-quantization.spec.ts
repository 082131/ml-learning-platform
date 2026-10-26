import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/precision/precision-quantization';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('FP32, FP16, BF16, INT8');
});

test('typing a number updates the bit layouts and the stored values', async ({ page }) => {
  const exp = page.locator('[data-experiment="bits"]');
  const fp16 = exp.locator('[data-format="fp16"]');
  await expect(fp16).toContainText('0x2e66');
  await expect(fp16.locator('[data-stored]')).toHaveText('0.0999755859375');
  await exp.getByLabel('Number to store').fill('70000');
  await expect(fp16.locator('[data-stored]')).toHaveText('inf');
  await expect(exp.locator('[data-format="bf16"] [data-stored]')).toHaveText('70144');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('clipped');
  await exp.getByLabel('Number to store').fill('abc');
  await expect(exp.getByRole('alert')).toContainText('Enter a number');
});

test('changing bits and granularity updates the code, the printout and the accuracy together', async ({
  page,
}) => {
  const controls = page.locator('[data-experiment="quant"]').filter({ has: page.getByRole('slider') });
  const lab = controls.locator('[data-correct]');
  await expect(lab).toHaveAttribute('data-correct', '349');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('MSE:         1.763e-05');

  await controls.getByLabel('Scale per').selectOption('channel');
  await expect(printout).toContainText('MSE:         8.439e-06');
  await expect(page.locator('[data-code-example="quant-numpy"]')).toContainText('axis=1)');

  const bits = controls.getByRole('slider', { name: 'Bits per weight' });
  await bits.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-code-example="quant-numpy"]')).toContainText('bits=2');
  await expect(lab).toHaveAttribute('data-correct', '225');
  await expect(printout).toContainText('accuracy:    62.5%');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="quant-numpy"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});
