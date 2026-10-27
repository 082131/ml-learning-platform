import { expect, test } from '@playwright/test';
import { logisticExercise } from '../../content/tracks/ml/classical/logistic-regression/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/logistic-regression';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Logistic regression');
});

test('training longer changes the weights, the boundary, the code literals and the readout together', async ({
  page,
}) => {
  const exp = page.locator('[data-experiment="logreg"]').filter({ has: page.getByRole('combobox') });
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('w1 = 2.7513, w2 = -0.6453, b = -1.2673');
  await expect(readout).toContainText('51/54 = 0.9444');
  const boundary = page.locator('[data-boundary]').first();
  const before = await boundary.getAttribute('x1');

  await exp.getByLabel('Learning rate η').selectOption('30');
  await exp.getByRole('slider', { name: 'Steps' }).focus();
  await page.keyboard.press('End');

  await expect(readout).toContainText('w1 = 10.8691, w2 = -4.5138, b = -4.6759');
  await expect(readout).toContainText('w1=10.8691 w2=-4.5138 b=-4.6759');
  await expect(readout).toContainText('53/54 = 0.9815');
  const train = page.locator('[data-code-example="logreg-numpy-gd"]');
  await expect(train).toContainText('lr = 30');
  await expect(train).toContainText('for step in range(500):');
  await expect(page.locator('[data-code-example="logreg-predict"]')).toContainText('w1, w2, b = 10.869081');
  expect(await boundary.getAttribute('x1')).not.toBe(before);
  await expect(page.locator('[data-logistic-point="0"]').first()).toContainText('z = 10.8691 × (-0.5951)');
});

test('selecting a penguin updates its numbers, the sigmoid marker and the step-through', async ({ page }) => {
  const exp = page.locator('[data-experiment="logreg"]').filter({ has: page.getByRole('combobox') });
  await exp.getByRole('slider', { name: 'Selected penguin' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('z = -2.0981, p = 0.1093');
  await expect(page.locator('[data-logistic-point="1"]').first()).toContainText('CSV row 1, Adelie');
  await expect(page.getByRole('figure', { name: 'The sigmoid function' }).first()).toContainText(
    'Penguin 2: z = -2.0981, so p = σ(z) = 0.1093',
  );
  const code = page.locator('[data-code-example="logreg-predict"]');
  await expect(code).toContainText('bill_length, bill_depth = 39.5, 17.4');
  const step = page.locator('[data-step-through="logreg-predict"]');
  await expect(step).toContainText('Step 1 of 9');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 6; i++) await next.click();
  await expect(step).toContainText('z = 2.7513 × (-0.522) + (-0.6453) × (-0.9381) + (-1.2673) = -2.0981.');
  await next.click();
  await next.click();
  await expect(step).toContainText('the penguin is an Adelie');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the sigmoid runner prints its table and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'sigmoid.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      '-4 0.018\n-2 0.1192\n0 0.5\n2 0.8808\n4 0.982',
      { timeout: 90_000 },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('sigmoid returned None', { timeout: 60_000 });
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(logisticExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
