import { expect, test } from '@playwright/test';
import { fitLineExercise, matmulProjectExercise } from '../../content/tracks/ml/math/project-math/quiz';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openMathLesson(page, 'project-math', 'Project: matrix multiply');
});

test('the brief lists the milestones and saves the checklist across a reload', async ({ page }) => {
  const first = page.getByRole('checkbox', { name: /matmul\(A, B\) works on lists of rows/ });
  await expect(page.getByText('Milestones · 0 of 6 done')).toBeVisible();
  await first.check();
  await expect(page.getByText('Milestones · 1 of 6 done')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /matmul\(A, B\) works on lists of rows/ })).toBeChecked();
  await expect(page.getByRole('row', { name: /Floating point/ })).toBeVisible();
});

test('both milestone exercises and the NumPy check script are on the page', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Milestone 1: matrix multiplication' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Milestone 2: gradient descent on a line' })).toBeVisible();
  await expect(page.locator('[data-code-example="project-math-check"]')).toContainText('np.polyfit');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 180_000 });

  test('the reference solution of matmulProjectExercise passes its tests in Pyodide', async ({ page }) => {
    const exercise = page.locator(`[data-exercise="${matmulProjectExercise.id}"]`);
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(matmulProjectExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 120_000 });
  });

  test('the reference solution of fitLineExercise passes its tests in Pyodide', async ({ page }) => {
    const exercise = page.locator(`[data-exercise="${fitLineExercise.id}"]`);
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(fitLineExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 120_000 });
  });
});
