import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/practice/model-testing';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Model testing');
});

const controlsBlock = (page: Page) =>
  page.locator('[data-experiment="model-testing"]').filter({ has: page.getByRole('combobox') });

test('the healthy model passes every check and ships', async ({ page }) => {
  const exp = controlsBlock(page);
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('RELEASE: ship');
  await expect(exp.getByRole('list', { name: 'Check results' })).toContainText(
    '2.11, 95% CI 1.77 to 2.46 (max 2.5)',
  );
});

test('a leaked label stops the pipeline before training, in the diagram, the list and the code', async ({
  page,
}) => {
  const exp = controlsBlock(page);
  await exp.getByRole('combobox', { name: 'Data fault' }).selectOption('leaked_label');
  // CPython 3.13 output of the lesson code with DATA_FAULT = "leaked_label".
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText(
    'RELEASE: blocked by data label leak',
  );
  const list = exp.getByRole('list', { name: 'Check results' });
  await expect(list.locator('[data-check="label leak"]')).toContainText('max |corr| 1.000 (logged_minutes)');
  await expect(list.locator('[data-check="smoke"]')).toContainText('not run');
  await expect(exp.locator('[data-node="train"] title')).toContainText('not run');
  await expect(page.locator('[data-code-example="model-testing-pipeline"]').first()).toContainText(
    'DATA_FAULT = "leaked_label"',
  );
});

test('ignoring the region at serving fails the behavior test even with loose gates', async ({ page }) => {
  const exp = controlsBlock(page);
  await exp.getByRole('combobox', { name: 'Serving fault' }).selectOption('region_ignored');
  const list = exp.getByRole('list', { name: 'Check results' });
  await expect(list.locator('[data-check="slice rural"]')).toContainText('FAIL');
  await expect(list.locator('[data-check="slice rural"]')).toContainText('7.87 on 19 (max 3.0)');
  await exp.getByRole('slider', { name: 'Gate: max val MAE' }).fill('5');
  await exp.getByRole('slider', { name: 'Gate: max slice MAE' }).fill('8');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText(
    'RELEASE: blocked by behav rural vs city',
  );
  await expect(page.locator('[data-code-example="model-testing-pipeline"]').first()).toContainText(
    'MAX_SLICE_MAE = 8.0',
  );
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="model-testing-pipeline"] [class*="kw"]').first().waitFor();
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
  test('the complete program runs every check and ships', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'pipeline.py (complete)' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const out = runner.getByRole('group', { name: 'Printed output' });
    await expect(out).toContainText('RELEASE: ship', { timeout: 90_000 });
    await expect(out).toContainText('behav  rural vs city  PASS  +7.81 min (expect > 0)');
  });
});
