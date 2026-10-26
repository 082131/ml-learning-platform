import { expect, test } from '@playwright/test';
import { heaviestExercise } from '../../content/tracks/ml/foundations/pandas-dataframes/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/pandas-dataframes', 'Pandas DataFrames');
});

test('filtering and grouping update the rows, the bars, the code and the readout', async ({ page }) => {
  const viz = page.locator('[data-viz="Penguins table explorer"]');
  await expect(viz.locator('[data-row-count]')).toHaveText('344');
  await expect(viz.locator('[data-group="Gentoo"]')).toContainText('5076.0');

  await page.getByRole('combobox', { name: 'Group by' }).selectOption('sex');
  await page.getByRole('combobox', { name: 'Statistic' }).selectOption('count');
  await expect(viz.locator('[data-group="female"]')).toContainText('165');
  await expect(viz).toContainText('11 rows have no sex (NaN)');

  await page.getByRole('combobox', { name: 'Keep species' }).selectOption('Chinstrap');
  await page.getByRole('combobox', { name: 'Keep island' }).selectOption('Biscoe');
  await expect(viz.locator('[data-row-count]')).toHaveText('0');
  await expect(viz).toContainText('Empty DataFrame');
  const code = page.locator('[data-code-example="table-code"]');
  await expect(code).toContainText(
    'df = penguins[(penguins["species"] == "Chinstrap") & (penguins["island"] == "Biscoe")]',
  );
  await expect(code).toContainText('print(df.groupby("sex")["body_mass_g"].count())');
  await expect(page.getByRole('region', { name: 'Values the code computes' })).toContainText('len(df)0');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Penguins table explorer"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 150_000 });
  test('pandas downloads the bundled CSV, prints the lesson output, and the exercise passes', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'penguins.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const printed = runner.getByRole('group', { name: 'Printed output' });
    await expect(printed).toContainText('(344, 8)', { timeout: 120_000 });
    await expect(printed).toContainText('Gentoo       5076.0');
    await expect(printed).toContainText('215  Gentoo              231.0');

    const exercise = page.locator('#section-exercise');
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(heaviestExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
