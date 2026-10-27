import { expect, test } from '@playwright/test';
import { fillExercise } from '../../content/tracks/ml/classical/data-cleaning/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto('./#/learn/ml/classical/data-cleaning');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Data cleaning');
});

const controls = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="data-cleaning"]').filter({ has: page.getByRole('combobox') });

test('a fill strategy changes the table, the code, the strip, the readout and the trace together', async ({
  page,
}) => {
  const table = page.locator('[data-cleaning-table]');
  await expect(table.locator('tr[data-row="3"]')).toHaveAttribute('data-status', 'numeric');
  await expect(table.locator('tr[data-row="8"]')).toHaveAttribute('data-status', 'sex');

  await controls(page).getByRole('combobox', { name: 'Missing measurements' }).selectOption('median');
  await controls(page).getByRole('combobox', { name: 'Missing sex (categorical)' }).selectOption('unknown');

  // All 14 rows are kept; row 3's body mass is the median of the 12 present values, 3975.
  await expect(table.locator('tr[data-row="3"]')).toHaveAttribute('data-status', 'kept');
  await expect(table.locator('tr[data-row="3"]')).toContainText('3975');
  await expect(table.locator('tr[data-row="8"]')).toContainText('unknown');

  const code = page.locator('[data-code-example="cleaning-pandas"]');
  await expect(code).toContainText('clean = df.fillna(df[num_cols].median())');
  await expect(code).toContainText('clean = clean.fillna({"sex": "unknown"})');

  // pandas 3.0.2 prints these lines for this state (see src/lib/classical/cleaning.test.ts).
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('rows: 14 -> 14');
  await expect(printed).toContainText('mean: 4167.857142857143 median: 3975.0 std: 828.6');
  await expect(printed).toContainText('fences: 2203.125 5778.125');
  await expect(printed).toContainText('outliers: [267]');
  await expect(page.locator('[data-mass-strip]')).toHaveAttribute('data-outliers', '267');

  const step = page.locator('[data-step-through="cleaning-iqr-loop"]');
  await expect(step.locator('[data-active-line]')).toContainText('masses = [3750.0, 3800.0, 3250.0, 3975.0');
  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('Done. 1 value(s) flagged.');
});

test('the injected typo moves the mean far more than the median and is flagged', async ({ page }) => {
  await controls(page)
    .getByRole('combobox', { name: 'Data-entry typo (not in the real data)' })
    .selectOption('on');
  await expect(page.locator('[data-code-example="cleaning-pandas"]')).toContainText(
    'df.loc[0, "body_mass_g"] = 37500.0  # injected typo, not in the real data',
  );
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('mean: 7950.0 median: 4150.0 std: 11124.2');
  await expect(printed).toContainText('outliers: [0]');
  await expect(page.locator('[data-mass-strip]')).toHaveAttribute('data-outliers', '0');
  await expect(page.locator('[data-cleaning-table] tr[data-row="0"]')).toContainText('typo injected');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the pure-Python IQR rule prints its output and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'iqr_rule.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      'outlier: 37500.0\nfences: 0.0 9200.0',
      { timeout: 90_000 },
    );

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(fillExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
