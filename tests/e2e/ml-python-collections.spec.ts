import { expect, test } from '@playwright/test';
import { countsExercise } from '../../content/tracks/ml/foundations/python-collections/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/python-collections', 'Lists, dicts, indexing and slicing');
});

test('choosing start, stop and step updates the picture, the code and the printed list', async ({ page }) => {
  const viz = page.locator('[data-viz="Slicing a list"]');
  await expect(viz.locator('[data-slice-result]')).toContainText("letters[1:6:2] = ['b', 'd', 'f']");

  await page.getByRole('combobox', { name: 'start' }).selectOption('blank');
  await page.getByRole('combobox', { name: 'stop' }).selectOption('blank');
  await page.getByRole('combobox', { name: 'step' }).selectOption('-1');
  await expect(viz.locator('[data-slice-result]')).toContainText(
    "letters[::-1] = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']",
  );
  await expect(viz.locator('[data-position="7"]')).toHaveAttribute('data-picked', '1');
  await expect(page.locator('[data-code-example="slice-code"]')).toContainText('part = letters[::-1]');
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('(7, -1, -1)');
  await expect(readout).toContainText('print(len(part))8');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Slicing a list"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the runner shows the shared list and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'collections.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '[1, 2, 3, 4] [1, 2, 3, 4, 5]',
      {
        timeout: 90_000,
      },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(countsExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
