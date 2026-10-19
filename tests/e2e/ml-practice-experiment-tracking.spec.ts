import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/experiment-tracking';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Experiment tracking');
});

const controlsBlock = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="tracking"]').filter({ has: page.getByRole('slider') });

test('the printed record, the code literal and the charts start at the Python values', async ({ page }) => {
  const readout = page.getByRole('region', { name: 'What the code prints, and what the charts compute' });
  await expect(readout).toContainText('"val_mse": 31.1996');
  await expect(readout).toContainText('identical metrics ✓');
  await expect(readout).toContainText('7 of 10');
  await expect(page.locator('[data-code-example="tracking-record"]')).toContainText(
    'config = {"lr": 0.005, "epochs": 20, "batch_size": 8}',
  );
  await expect(page.locator('[data-viz="Final validation MSE by seed"]').first()).toContainText(
    'B beats A on 7 of 10 seeds',
  );
});

test('changing the seed and a learning rate updates code, record and charts together', async ({ page }) => {
  const exp = controlsBlock(page);
  const seed = exp.getByRole('slider', { name: 'Seed of the printed run' });
  await seed.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const readout = exp.getByRole('region', { name: 'Result' });
  // Seed 3 of config A ends at 26.9867 (CPython 3.13 output of the lesson code).
  await expect(readout).toContainText('"seed": 3');
  await expect(readout).toContainText('"val_mse": 26.9867');
  await expect(page.locator('[data-code-example="tracking-record"]')).toContainText('seed = 3');
  await expect(exp.locator('[data-viz="Validation MSE per epoch, seed 3"]')).toBeVisible();

  const lr = exp.getByRole('slider', { name: 'A: learning rate' });
  await lr.fill('0.02');
  await expect(readout).toContainText('"metrics": {"status": "diverged", "epoch": 4}');
  await expect(readout).toContainText('Diverged');
  await expect(page.locator('[data-code-example="tracking-record"]')).toContainText('"lr": 0.02');
});

test('one seed hides the spread', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('slider', { name: 'Seeds to compare' }).fill('1');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('1 of 1');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="tracking-record"] [class*="kw"]').first().waitFor();
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
  test('the complete program prints the same record as the readout', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'train_and_record.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '"val_mse": 31.1996}}',
      {
        timeout: 90_000,
      },
    );
  });
});
