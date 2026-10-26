import { expect, test } from '@playwright/test';
import { statsRunner } from '../../content/tracks/ml/math/statistics-intuition/code';
import { stdExercise } from '../../content/tracks/ml/math/statistics-intuition/quiz';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openMathLesson(page, 'statistics-intuition', 'Mean, variance');
});

test('splitting by season and removing its effect changes the correlation', async ({ page }) => {
  const viz = page.locator('[data-viz="Ice cream and sunburn"]');
  // Seed 1, full season effect (values from the simulator's unit-tested computation)
  await expect(viz).toContainText('Across all days r = 0.7678.');
  await expect(page.getByText('r, summer days only')).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Season' }).selectOption('season');
  await expect(viz).toContainText('within summer r = 0.1172, within winter r = 0.1392');
  await expect(viz.getByText('summer day', { exact: true })).toBeVisible();

  const effect = page.getByRole('slider', { name: 'How much summer raises both' });
  await effect.focus();
  await page.keyboard.press('Home'); // 0%: the season no longer affects either quantity
  await expect(viz).toContainText('Across all days r = 0.1294;');
});

test('the code shows the real NumPy output for the fixed data', async ({ page }) => {
  await expect(page.locator('[data-code-example="stats-split"]')).toContainText('-0.07641607199008701');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 180_000 });

  test('the describe_stdlib.py runner prints the output stated in the lesson', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'describe_stdlib.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      statsRunner.expectedOutput!,
      {
        timeout: 120_000,
      },
    );
  });

  test('the reference solution of stdExercise passes its tests in Pyodide', async ({ page }) => {
    const exercise = page.locator(`[data-exercise="${stdExercise.id}"]`);
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(stdExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 120_000 });
  });
});
