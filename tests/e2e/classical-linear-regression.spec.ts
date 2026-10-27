import { expect, test } from '@playwright/test';
import { lineExercise } from '../../content/tracks/ml/classical/linear-regression/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/linear-regression';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Linear regression');
});

test('moving the slope changes the plot, the code literal, the readout and the MSE trace together', async ({
  page,
}) => {
  const fit = page.locator('[data-experiment="linreg-fit"]').filter({ has: page.getByRole('slider') });
  await expect(fit.getByRole('region', { name: 'Your line' })).toContainText('1.8176 / 12 = 0.1515 kg²');
  const slope = fit.getByRole('slider', { name: 'Slope w (kg per cm)' });
  await slope.focus();
  await page.keyboard.press('ArrowRight');

  // Plot: the selected penguin's arithmetic and the caption use w = 0.31
  await expect(page.locator('[data-fit-point="0"]')).toContainText(
    'ŷ = w·x + b = 0.31 × 18.1 + (-1.8) = 3.811',
  );
  await expect(page.locator('[data-fit-point="0"]')).toContainText('r = y − ŷ = 3.75 − 3.811 = -0.061');
  await expect(fit.getByRole('figure', { name: 'Body mass against flipper length' })).toContainText(
    'MSE = 0.1786 kg²',
  );
  // Readout and code literal
  await expect(fit.getByRole('region', { name: 'Your line' })).toContainText('2.1431 / 12 = 0.1786 kg²');
  const code = page.locator('[data-code-example="linreg-mse-loop"]').first();
  await expect(code).toContainText('w = 0.31');
  await expect(page.getByRole('region', { name: 'What the code prints' }).first()).toContainText('0.1786');
  // Trace: step 7 computes the first prediction with the new slope
  const step = page.locator('[data-step-through="linreg-mse-loop"]');
  await expect(step).toContainText('Step 1 of 55');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 6; i++) await next.click();
  await expect(step).toContainText('y_hat = 0.31 × 18.1 + (-1.8) = 3.811 kg predicted.');
});

test('selecting another penguin and showing the least-squares line', async ({ page }) => {
  const fit = page.locator('[data-experiment="linreg-fit"]').filter({ has: page.getByRole('slider') });
  const sel = fit.getByRole('slider', { name: 'Selected penguin' });
  await sel.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-fit-point="1"]')).toContainText('CSV row 30');
  await expect(page.locator('[data-fit-point="1"]')).toContainText('r² = (-0.29)² = 0.0841');
  await fit.getByLabel('Least-squares line').selectOption('show');
  await expect(fit.locator('[data-line="least-squares"]')).toHaveCount(1);
  await expect(fit.getByRole('region', { name: 'Your line' })).toContainText(
    'ŷ = 0.4302·x − 4.3737, MSE 0.121 kg²',
  );
});

test('gradient descent: raw x stalls, centered x reaches the closed form, too large a rate diverges', async ({
  page,
}) => {
  const gd = page.locator('[data-experiment="linreg-gd"]').filter({ has: page.getByRole('combobox') });
  const readout = gd.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('slope=0.2115 intercept=0.0028 mse=0.2062');
  await expect(page.locator('[data-code-example="linreg-numpy-gd"]')).toContainText('shift = 0.0');

  await gd.getByLabel('x used for training').selectOption('centered');
  await gd.getByLabel('Learning rate η').selectOption('0.1');
  await expect(readout).toContainText('slope=0.4302 intercept=-4.3737 mse=0.1210');
  const code = page.locator('[data-code-example="linreg-numpy-gd"]');
  await expect(code).toContainText('shift = x.mean()');
  await expect(code).toContainText('lr = 0.1');
  await expect(gd.locator('[data-gd-update="100"]')).toBeVisible();

  await gd.getByLabel('x used for training').selectOption('raw');
  await gd.getByLabel('Learning rate η').selectOption('0.003');
  await expect(gd.locator('[data-gd-lin="diverged"]')).toBeVisible();
  await expect(readout).toContainText('Diverged');
  await expect(readout).toContainText('step 17');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the least-squares runner prints the closed form and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'least_squares.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      '19.925 4.1979\n9.1556 21.2825\n0.4302 -4.3737',
      { timeout: 90_000 },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('mse returned None', { timeout: 60_000 });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(lineExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
