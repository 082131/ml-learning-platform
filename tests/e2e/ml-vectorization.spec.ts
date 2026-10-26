import { expect, test } from '@playwright/test';
import { standardizeExercise } from '../../content/tracks/ml/foundations/vectorization/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/vectorization', 'Vectorization and broadcasting');
});

test('choosing shapes updates the alignment, the stretched grids, the code and the error', async ({
  page,
}) => {
  const viz = page.locator('[data-viz="Broadcasting A + B"]');
  const result = viz.locator('[data-broadcast-result]');
  await expect(result).toHaveText('C.shape = (2, 3)');
  await expect(viz.locator('[data-grid="B"] [data-copy]')).toHaveCount(3);
  await expect(viz.locator('[data-grid="C"]')).toContainText('35');

  await page.getByRole('combobox', { name: 'Shape of B' }).selectOption('3,2');
  await expect(result).toHaveText(
    'ValueError: operands could not be broadcast together with shapes (2,3) (3,2) ',
    { useInnerText: false },
  );
  await expect(viz.locator('[data-rule="mismatch"]')).toHaveCount(2);
  const code = page.locator('[data-code-example="broadcast-code"]');
  await expect(code).toContainText('B = np.array([[10, 20], [30, 40], [50, 60]])');
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('operands could not be broadcast together');

  await page.getByRole('combobox', { name: 'Shape of A' }).selectOption('2,1');
  await page.getByRole('combobox', { name: 'Shape of B' }).selectOption('1,3');
  await expect(result).toHaveText('C.shape = (2, 3)');
  await expect(readout).toContainText('[[10 20 30]');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Broadcasting A + B"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test('the timing runner shows no numbers before it runs', async ({ page }) => {
  const timing = page.locator('[data-python-runner]').filter({ hasText: 'measured in your browser' });
  await expect(timing.getByRole('button', { name: 'Run and measure' })).toBeVisible();
  await expect(timing.getByRole('group', { name: /output/ })).toHaveCount(0);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 150_000 });
  test('the runners print their output, the timing is measured, and the exercise passes', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'vectorize.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText('[12.5 20. ]', {
      timeout: 90_000,
    });

    const timing = page.locator('[data-python-runner]').filter({ hasText: 'measured in your browser' });
    await timing.getByRole('button', { name: 'Run and measure' }).click();
    const printed = timing.getByRole('group', { name: 'Printed output' });
    await expect(printed).toContainText('Same answer: True', { timeout: 60_000 });
    await expect(printed).toContainText(/Python loop: +\d+\.\d ms/);
    await expect(printed).toContainText(/Measured in your browser just now: NumPy was \d+ times as fast\./);

    const exercise = page.locator('#section-exercise');
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(standardizeExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
