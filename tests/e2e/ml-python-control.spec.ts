import { expect, test } from '@playwright/test';
import { countExercise } from '../../content/tracks/ml/foundations/python-control/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/python-control', 'Functions, conditions, loops');
});

test('the scores and pass mark change the code, the trace and the printed result together', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: /^scores/ }).fill('80, 40');
  const mark = page.getByRole('slider', { name: 'pass_mark' });
  await mark.focus();
  await page.keyboard.press('ArrowRight'); // 60 → 65

  await expect(page.locator('[data-code-example="grading-loop"]')).toContainText('scores = [80, 40]');
  await expect(page.locator('[data-code-example="grading-loop"]')).toContainText('pass_mark = 65');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('1 of 2 passed');

  // def, scores, pass_mark, passed, then per score: for, if, return, call, check (+ add on a pass), then for, print
  const step = page.locator('[data-step-through="grading-loop"]');
  await expect(step.getByText('Step 1 of 17')).toBeVisible();
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 5; i++) await next.click();
  await expect(step).toContainText('Inside grade(): 80 >= 65 is True');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-step-through="grading-loop"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the while loop trace is recorded in Pyodide and the exercise passes', async ({ page }) => {
    const step = page.locator('[data-step-through="compound-while"]');
    await step.getByRole('button', { name: 'Record trace' }).click();
    await expect(step.getByText('Recorded in Python (Pyodide)')).toBeVisible({ timeout: 90_000 });
    await expect(step.getByText(/Step 1 of \d+/)).toBeVisible();

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(countExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
