import { expect, test } from '@playwright/test';
import { randomRunner } from '../../content/tracks/ml/math/probability/code';
import { expectedValueExercise } from '../../content/tracks/ml/math/probability/quiz';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openMathLesson(page, 'probability', 'Probability, distributions and expected value');
});

test('the simulator, histogram and NumPy code follow the distribution, sample size and seed', async ({
  page,
}) => {
  const viz = page.locator('[data-viz="Sample vs distribution"]');
  const code = page.locator('[data-code-example="sampling-numpy"]');
  await expect(viz).toContainText('100 draws with seed 1');
  await expect(page.getByText('Sample mean of 100 draws').first()).toBeVisible();
  await expect(code).toContainText('rng = np.random.default_rng(1)');

  const n = page.getByRole('slider', { name: 'Sample size n' }).first();
  await n.focus();
  await page.keyboard.press('ArrowRight'); // logN 2.5: n = round(10^2.5) = 316
  await expect(viz).toContainText('316 draws with seed 1');
  await expect(code).toContainText('n = 316');

  await page.getByRole('combobox', { name: 'Distribution' }).first().selectOption('loaded');
  await expect(code).toContainText('p=[0.1, 0.1, 0.1, 0.1, 0.1, 0.5]');
  await expect(page.getByText('4.5', { exact: true }).first()).toBeVisible();

  const seed = page.getByRole('spinbutton', { name: 'Seed' }).first();
  await seed.fill('2');
  await expect(viz).toContainText('316 draws with seed 2');
  await expect(code).toContainText('default_rng(2)');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 180_000 });

  test('the dice.py runner prints the output stated in the lesson', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'dice.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      randomRunner.expectedOutput!,
      {
        timeout: 120_000,
      },
    );
  });

  test('the reference solution of expectedValueExercise passes its tests in Pyodide', async ({ page }) => {
    const exercise = page.locator(`[data-exercise="${expectedValueExercise.id}"]`);
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(expectedValueExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 120_000 });
  });
});
