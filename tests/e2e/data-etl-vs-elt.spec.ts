import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { splitExercise } from '../../content/tracks/data/etl/etl-vs-elt/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/data/etl/etl-vs-elt';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ETL vs ELT');
});

test('injecting a bad record changes the diagram, the record table and the warehouse readout together', async ({
  page,
}) => {
  const exp = page.locator('[data-experiment="etl"]');
  const fate = exp.locator('[data-etl-fate]');
  const readout = exp.getByRole('region', { name: 'What the warehouse contains' });
  const injected = exp.locator('[data-etl-records] tbody tr').nth(5);

  // Start: ETL, decimal comma, validation on → quarantined.
  await expect(fate).toHaveAttribute('data-etl-fate', 'quarantined');
  await expect(injected).toContainText('quarantine: amount is not a decimal number');
  await expect(exp.locator('[data-node="quarantine"] title')).toHaveText('Quarantine file, 1 row, warning');
  await expect(readout).toContainText("('NO', 12.0)");

  // Validation off: Python's float() stops the batch.
  await exp.getByLabel('Validation rules').selectOption('off');
  await expect(fate).toHaveAttribute('data-etl-fate', 'failed');
  await expect(fate).toContainText("ValueError: could not convert string to float: '12,50'");
  await expect(exp.locator('[data-node="transform"] title')).toContainText('failed');
  await expect(readout).toContainText('(no rows)');

  // ELT: SQLite's CAST keeps the prefix and loads 12.0 silently.
  await exp.getByLabel('Pipeline').selectOption('elt');
  await expect(fate).toHaveAttribute('data-etl-fate', 'loaded-wrong');
  await expect(injected).toContainText('orders (amount 12.0)');
  await expect(readout).toContainText("('NO', 24.0)");
  await expect(exp.locator('[data-node="raw"]')).toBeVisible();

  // A plausible-looking wrong value: only visible in the totals.
  await exp.getByLabel('Inject into record 1006').selectOption('cents');
  await expect(readout).toContainText("('NO', 4562.0)");
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="etl-python"] [class*="kw"]').first().waitFor();
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

  test('the validation demo prints its quarantine and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'validate_demo.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '1003 unknown country code',
      {
        timeout: 90_000,
      },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('only the row with a positive amount is valid', {
      timeout: 60_000,
    });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(splitExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
