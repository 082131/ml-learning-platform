import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/ablations';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ablation');
});

const controlsBlock = (page: Page) =>
  page.locator('[data-experiment="ablation"]').filter({ has: page.getByRole('combobox') });

test('the starting table finds distance most important and order_id within noise', async ({ page }) => {
  const readout = controlsBlock(page).getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('2.094 ± 0.182');
  await expect(readout).toContainText('distance: removing it adds 7.585 min');
  await expect(readout).toContainText('order_id');
});

test('leaving region out updates the slices, the code and the bars together', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('combobox', { name: 'Baseline: region' }).selectOption('off');
  // CPython 3.13 output of the lesson code with baseline = ["distance", "stops", "rain", "order_id"].
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('3.617 ± 0.358');
  await expect(readout).toContainText('rural: MAE 4.896 on 19');
  await expect(page.locator('[data-code-example="ablation-study"]').first()).toContainText(
    'baseline = ["distance", "stops", "rain", "order_id"]',
  );
  const slices = exp.locator('[data-viz="Baseline error by region (seed 0)"]');
  await expect(slices.locator('[data-bar="rural"]')).toHaveClass(/accent/);
  await expect(
    exp.locator('[data-viz="Ablation: val MAE without each component"] [data-bar="- region"]'),
  ).toHaveCount(0);
});

test('one seed gives no noise estimate', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('slider', { name: 'Seeds (splits) per model' }).fill('1');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('2.099 ± 0.000');
  await expect(page.locator('[data-code-example="ablation-study"]').first()).toContainText(
    'seeds = range(1)',
  );
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="ablation-study"] [class*="kw"]').first().waitFor();
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
  test('the complete program prints the ablation table', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'ablate.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const out = runner.getByRole('group', { name: 'Printed output' });
    await expect(out).toContainText('- order_id     2.086 ± 0.165', { timeout: 90_000 });
    await expect(out).toContainText('rural  MAE 1.982 on 19 deliveries (seed 0)');
  });
});
