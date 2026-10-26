import { expect, test } from '@playwright/test';
import { splitExercise } from '../../content/tracks/ml/foundations/numpy-arrays/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/numpy-arrays', 'NumPy arrays');
});

test('changing the shape and index updates the grid, the code and the printed result', async ({ page }) => {
  const viz = page.locator('[data-viz="Array shape and indexing"]');
  const result = viz.locator('[data-index-result]');
  await expect(result).toContainText('a[1, 2] = 6');
  await expect(viz.locator('td[data-picked]')).toHaveCount(1);
  await expect(viz.locator('td[data-value="6"]')).toHaveAttribute('data-picked', 'true');

  await page.getByRole('combobox', { name: 'Shape of a' }).selectOption('4,3');
  await expect(result).toContainText('a[1, 2] = 5');

  await page.getByRole('combobox', { name: 'Index' }).selectOption('column');
  await expect(result).toContainText('a[:, 2] = [ 2  5  8 11]');
  await expect(page.locator('[data-code-example="index-code"]')).toContainText(
    'a = np.arange(12).reshape(4, 3)',
  );
  await expect(page.locator('[data-code-example="index-code"]')).toContainText('part = a[:, 2]');
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('(4,)');

  await page.getByRole('combobox', { name: 'Shape of a' }).selectOption('12');
  await expect(result).toContainText(
    'IndexError: too many indices for array: array is 1-dimensional, but 2 were indexed',
  );
  await expect(readout).toContainText('IndexError');

  await page.getByRole('combobox', { name: 'Shape of a' }).selectOption('3,4');
  await page.getByRole('combobox', { name: 'Index' }).selectOption('row');
  await page.getByRole('slider', { name: 'i' }).fill('3');
  await expect(result).toContainText('IndexError: index 3 is out of bounds for axis 0 with size 3');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Array shape and indexing"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the runner prints the browser dtype and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'arrays.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const printed = runner.getByRole('group', { name: 'Printed output' });
    await expect(printed).toContainText('[ 0  1  2  3  4  5  6  7  8  9 10 11] int32', { timeout: 90_000 });
    await expect(printed).toContainText('[1, 2, 3, 1, 2, 3]');
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(splitExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
