import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { matmulExercise } from '../../content/tracks/ml/math/matrix-multiplication/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/math/matrix-multiplication';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Matrix multiplication');
});

test('editing A[0][1] changes the grid, the code literal, the trace arithmetic and the readout together', async ({
  page,
}) => {
  const grid = page.locator('[data-viz="A × B = C"]');
  const cell = grid.getByRole('textbox', { name: 'A[0][1]' });
  await cell.fill('5');

  // Grid: C[0][0] = 1·7 + 5·9 + 3·11 = 85, C[0][1] = 1·8 + 5·10 + 3·12 = 94
  await expect(grid.getByRole('button', { name: 'C[0][0] = 85' })).toBeVisible();
  await expect(grid.getByRole('button', { name: 'C[0][1] = 94' })).toBeVisible();
  await expect(grid.locator('[data-entry="0,0"]')).toContainText('= 1·7 + 5·9 + 3·11');

  // Code literal in the NumPy example
  const code = page.locator('[data-code-example="matmul-numpy"]');
  await expect(code).toContainText('A = np.array([[1, 5, 3], [4, 5, 6]])');

  // Readout: NumPy's printout of the new C
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('[[ 85  94]');
  await expect(readout).toContainText('[139 154]]');

  // Trace: the second multiply-add of C[0][0] uses the new value
  const step = page.locator('[data-step-through="matmul-loop"]');
  await expect(step.locator('[data-active-line]')).toContainText('A = [[1, 5, 3], [4, 5, 6]]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 7; i++) await next.click();
  await expect(step.getByText('Step 8 of 26')).toBeVisible();
  await expect(step).toContainText('k = 1: A[0][1] · B[1][0] = 5 · 9 = 45, so C[0][0] = 7 + 45 = 52.');
});

test('selecting an entry of C highlights its row and column and writes out its sum', async ({ page }) => {
  const grid = page.locator('[data-viz="A × B = C"]');
  await grid.getByRole('button', { name: 'C[1][0] = 139' }).click();
  await expect(grid.getByRole('button', { name: 'C[1][0] = 139' })).toHaveAttribute('aria-pressed', 'true');
  await expect(
    grid.locator('[data-matrix="A"]').getByRole('rowheader', { name: 'row 1 (highlighted)' }),
  ).toBeVisible();
  await expect(
    grid.locator('[data-matrix="B"]').getByRole('columnheader', { name: 'column 0 (highlighted)' }),
  ).toBeVisible();
  await expect(grid.locator('[data-entry="1,0"]')).toContainText('= 4·7 + 5·9 + 6·11');
  await expect(grid.locator('[data-entry="1,0"]')).toContainText('= 139');
});

test('changing a size reshapes A, B, C, the code and the trace', async ({ page }) => {
  const exp = page.locator('[data-experiment="matmul"]').filter({ has: page.getByRole('slider') });
  const slider = exp.getByRole('slider', { name: 'Columns of B (p)' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('(2, 3)');
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText('2·3·3 = 18');
  await expect(page.locator('[data-matrix="C"] caption')).toContainText('shape (2, 3)');
  await expect(page.locator('[data-step-through="matmul-loop"]')).toContainText('Step 1 of 36');
  await expect(page.locator('[data-code-example="matmul-numpy"]')).toContainText('B = np.array([[7, 8, ');
});

test('an invalid cell is explained and does not change the product', async ({ page }) => {
  const grid = page.locator('[data-viz="A × B = C"]');
  await grid.getByRole('textbox', { name: 'B[0][0]' }).fill('2.5');
  await expect(grid.getByRole('alert')).toContainText('B[0][0]: Enter a whole number.');
  await expect(grid.getByRole('button', { name: 'C[0][0] = 58' })).toBeVisible();
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="matmul-numpy"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the loop runner prints the product and the exercise tests pass with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'matmul_loops.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('[[58, 64], [139, 154]]', {
      timeout: 90_000,
    });

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('the lesson example should give', {
      timeout: 60_000,
    });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(matmulExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
