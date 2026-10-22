import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/versioning';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('versioning');
});

const controlsBlock = (page: Page) =>
  page.locator('[data-experiment="versioning"]').filter({ has: page.getByRole('combobox') });

test('editing a data cell changes the data, run and model hashes, the code and the lineage together', async ({
  page,
}) => {
  const exp = controlsBlock(page);
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('data   8cef040fae78');
  await exp.getByRole('textbox', { name: 'rows[5][1]' }).fill('44');
  // CPython 3.13 output of the lesson code with the last row set to 12,44.
  await expect(readout).toContainText('data   4222f97f30d0');
  await expect(readout).toContainText('run    51b511b74d6d');
  await expect(readout).toContainText('model  b5a3b989ca51 {"w": 2.8192, "b": 10.0686}');
  await expect(page.locator('[data-code-example="versioning-hashes"]')).toContainText('12,44\\n"');
  const diagram = exp.locator('[data-viz="Lineage of model.json"]');
  await expect(diagram.locator('[data-node="data"] title')).toHaveText('data.csv, 4222f97f30d0, warning');
  await expect(diagram.locator('[data-node="config"] title')).toHaveText('config.json, 70c76fc9e04a, ok');
});

test('a different config can give the same model', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('combobox', { name: 'config: drop_over_minutes' }).selectOption('90');
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('config 55266b1bb776');
  await expect(readout).toContainText('model  4e11ae29f6b4');
  await expect(page.locator('[data-code-example="versioning-hashes"]')).toContainText(
    'config = {"drop_over_minutes": 90}',
  );
});

test('equal distances make the fit fail, and it is labeled', async ({ page }) => {
  const exp = controlsBlock(page);
  for (let i = 0; i < 6; i++) await exp.getByRole('textbox', { name: `rows[${i}][0]` }).fill('3');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText(
    'ZeroDivisionError: division by zero',
  );
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="versioning-hashes"] [class*="kw"]').first().waitFor();
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
  test('the complete program prints the starting versions', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'versions.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      'model  4e11ae29f6b4 {"w": 2.8039, "b": 10.1373}',
      { timeout: 90_000 },
    );
  });
});
