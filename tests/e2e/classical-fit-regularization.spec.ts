import { expect, test, type Page } from '@playwright/test';
import { ridgeExercise } from '../../content/tracks/ml/classical/fit-regularization/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/fit-regularization';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Overfitting, underfitting');
});

const controls = (page: Page) =>
  page.locator('[data-experiment="fit-regularization"]').filter({ has: page.getByRole('slider') });
const printed = (page: Page) => page.getByRole('region', { name: 'What the code prints' });
const code = (page: Page) => page.locator('[data-code-example="fit-ridge-numpy"]');

test('the starting fit agrees across the plot, the code and the readout', async ({ page }) => {
  // NumPy printed "train MSE 0.0682, validation MSE 0.0656" for degree 3, lam = 10 ** -8 (see polyRidge.test.ts)
  await expect(printed(page)).toContainText('train MSE 0.0682, validation MSE 0.0656');
  await expect(code(page)).toContainText('degree = 3');
  await expect(code(page)).toContainText('lam = 10 ** -8');
  await expect(page.locator('[data-viz="Degree 3 fit, lambda = 1.0e-8"]')).toContainText(
    'validation MSE 0.0656',
  );
  await expect(page.locator('[data-viz="Error vs degree, lambda = 10^-8"]').first()).toContainText(
    'Validation MSE is lowest at degree 3 (0.0656)',
  );
});

test('raising the degree overfits, and λ reins it in', async ({ page }) => {
  const exp = controls(page);
  const degree = exp.getByRole('slider', { name: 'Polynomial degree d' });
  await degree.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(code(page)).toContainText('degree = 9');
  await expect(printed(page)).toContainText('train MSE 0.0420, validation MSE 0.8582');
  await expect(page.locator('[data-viz="Degree 9 fit, lambda = 1.0e-8"]')).toBeVisible();
  const diagnosis = page.locator('#section-experiment').getByRole('region', { name: 'Result' });
  await expect(diagnosis).toContainText('Overfitting side');

  await page.keyboard.press('End');
  const lam = exp.getByRole('slider', { name: 'Penalty: log₁₀ lambda' });
  await lam.focus();
  for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowRight');
  await expect(code(page)).toContainText('lam = 10 ** -2.5');
  await expect(printed(page)).toContainText('train MSE 0.0513, validation MSE 0.1833');
  await expect(page.locator('[data-viz="Error vs log₁₀ lambda, degree 12"]').first()).toContainText(
    'Validation MSE is lowest at log₁₀ λ = -0.5',
  );
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the ridge exercise passes with the solution', async ({ page }) => {
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(ridgeExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 90_000 });
  });
});
