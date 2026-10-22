import { expect, test } from '@playwright/test';
import { predictExercise } from '../../content/tracks/ml/foundations/types-of-ml/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/types-of-ml', 'Supervised, unsupervised');
});

test('moving the new penguin changes the prediction, and switching setups shows clusters', async ({
  page,
}) => {
  const exp = page.locator('[data-experiment="learning-types"]');
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(exp.locator('[data-answer]')).toContainText('Predicted species: Gentoo');

  // 45 → 44 mm long, 14.5 → 18.5 mm deep: closest to the Chinstrap average.
  const length = exp.getByRole('slider', { name: 'New penguin: bill length (mm)' });
  await length.focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowLeft');
  const depth = exp.getByRole('slider', { name: 'New penguin: bill depth (mm)' });
  await depth.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await expect(readout).toContainText('length 44.0 mm, depth 18.5 mm');
  await expect(exp.locator('[data-answer]')).toContainText('Predicted species: Chinstrap');

  await exp.getByRole('combobox', { name: 'What the program is given' }).selectOption('unsupervised');
  await expect(exp.locator('[data-viz="Unlabeled penguins, k-means with k = 3"]')).toBeVisible();
  await expect(readout).toContainText('141 penguins; afterwards we checked: 140 are Adelie');
  const k = exp.getByRole('slider', { name: 'Unsupervised: number of clusters (k)' });
  await k.focus();
  await page.keyboard.press('ArrowRight');
  await expect(readout).toContainText('49 penguins; afterwards we checked: 38 are Chinstrap');
  await expect(exp.locator('[data-center]')).toHaveCount(4);
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Labeled penguins (supervised)"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the runner prints the predictions and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'nearest_average.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText('Gentoo 48.05 14.75', {
      timeout: 90_000,
    });
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(predictExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
