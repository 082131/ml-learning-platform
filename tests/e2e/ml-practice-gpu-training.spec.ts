import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/gpu-training';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('GPU');
});

const controlsBlock = (page: Page) =>
  page.locator('[data-experiment="gpu-training"]').filter({ has: page.getByRole('combobox') });

test('the default estimate fits and is compute-bound', async ({ page }) => {
  const readout = controlsBlock(page).getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('10.42 of 80 GB: fits');
  await expect(readout).toContainText('167,149 tokens/s');
  await expect(readout).toContainText('16.6 h');
});

test('float32 on a T4 does not fit, and the code and charts follow', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('combobox', { name: 'GPU' }).selectOption('T4');
  await exp.getByRole('combobox', { name: 'Precision' }).selectOption('fp32');
  // CPython 3.13 output of the lesson code with gpu="T4", precision="fp32".
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('15.55 of 16 GB: fits');
  await exp.getByRole('slider', { name: 'Batch size (sequences of 1024 tokens)' }).fill('20');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('does NOT fit');
  await expect(page.locator('[data-code-example="gpu-estimator"]').first()).toContainText(
    'estimate(gpu="T4", model="GPT-2 small", precision="fp32", batch=20',
  );
  await expect(exp.locator('[data-viz="Memory estimate (GB)"]')).toContainText('Does not fit');
});

test('a slow loader becomes the bottleneck', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('slider', { name: 'Data loader (samples/s)' }).fill('50');
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('data loading; GPU busy 31% of the step');
  await expect(readout).toContainText('54.3 h');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="gpu-estimator"] [class*="kw"]').first().waitFor();
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

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the complete estimator prints the default estimate', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'estimate.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      'throughput 167,149 tokens/s, GPU busy 100% of the step',
      { timeout: 90_000 },
    );
  });
});
