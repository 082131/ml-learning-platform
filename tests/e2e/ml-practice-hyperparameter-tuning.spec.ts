import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/hyperparameter-tuning';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hyperparameter tuning');
});

const controlsBlock = (page: Page) =>
  page.locator('[data-experiment="tuning"]').filter({ has: page.getByRole('slider') });

test('the readout prints the Python lines for the starting values', async ({ page }) => {
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText(
    'grid: best loss 0.6866 at lr=10^-2.50, dropout=0.25; 3 distinct learning rates',
  );
  await expect(readout).toContainText(
    'random: best loss 0.3023 at lr=10^-1.88, dropout=0.16; 9 distinct learning rates',
  );
  await expect(readout).toContainText('patience 3: best epoch 25 (loss 0.4405), stopped after epoch 28');
  await expect(page.locator('[data-code-example="tuning-search"]')).toContainText(
    'k, seed, patience = 3, 0, 3',
  );
});

test('changing the budget and the patience changes the plot, the code and the readout', async ({ page }) => {
  const exp = controlsBlock(page);
  const k = exp.getByRole('slider', { name: 'Budget: k × k trials, k =' });
  await k.focus();
  await page.keyboard.press('ArrowRight');
  const readout = exp.getByRole('region', { name: 'Result' });
  // k = 4: the grid includes log10(lr) = -2 (CPython 3.13 output of the lesson code).
  await expect(readout).toContainText('grid: best loss 0.3207 at lr=10^-2.00');
  await expect(readout).toContainText('16 distinct learning rates');
  await expect(exp.locator('[data-trials="square"] rect')).toHaveCount(16 + 1);
  await expect(page.locator('[data-code-example="tuning-search"]')).toContainText(
    'k, seed, patience = 4, 0, 3',
  );

  await exp.getByRole('slider', { name: 'Early-stopping patience (epochs)' }).fill('1');
  await expect(readout).toContainText('patience 1: best epoch 15 (loss 0.4879), stopped after epoch 16');
  await expect(readout).toContainText('no: stopped at 15, the best is epoch 25');
  await expect(exp.locator('[data-viz="Early stopping with patience 1"]')).toBeVisible();
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="tuning-search"] [class*="kw"]').first().waitFor();
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
  test('the complete program prints the readout lines', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'tune.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      'patience 3: best epoch 25 (loss 0.4405), stopped after epoch 28',
      { timeout: 90_000 },
    );
  });
});
