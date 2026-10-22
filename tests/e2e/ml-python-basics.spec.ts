import { expect, test } from '@playwright/test';
import { receiptExercise } from '../../content/tracks/ml/foundations/python-basics/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/python-basics', 'Python: values, variables');
});

test('changing price and quantity updates the code literals, the trace and the printed output', async ({
  page,
}) => {
  const exp = page.locator('[data-experiment="basics"]').filter({ has: page.getByRole('slider') });
  const price = exp.getByRole('slider', { name: 'price' });
  await price.focus();
  for (let i = 0; i < 1; i++) await page.keyboard.press('ArrowLeft'); // 2.5 → 2.0
  const quantity = exp.getByRole('slider', { name: 'quantity' });
  await quantity.focus();
  await page.keyboard.press('ArrowRight'); // 3 → 4

  const code = page.locator('[data-code-example="basics-program"]');
  await expect(code).toContainText('price = 2.0');
  await expect(code).toContainText('quantity = 4');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText(
    'apples x4 costs 8.0',
  );

  const step = page.locator('[data-step-through="basics-program"]');
  await expect(step.getByText('Step 1 of 7')).toBeVisible();
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 3; i++) await next.click();
  await expect(step).toContainText('price * quantity = 2.0 · 4 = 8.0');
  await expect(step.locator('[data-change="new"]')).toContainText('8.0');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page
    .locator('[data-code-example="basics-program"] [class*="kw"]')
    .first()
    .waitFor({ state: 'attached' });
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the playground prints real output and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'playground.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText('0.30000000000000004', {
      timeout: 90_000,
    });
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(receiptExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
