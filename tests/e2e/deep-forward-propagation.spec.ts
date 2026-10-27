import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { denseExercise } from '../../content/tracks/ml/deep/forward-propagation/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/forward-propagation';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Layers and forward propagation');
});

test('selecting the output layer marks its code lines, its stages and its arithmetic', async ({ page }) => {
  const viz = page.locator('[data-forward-layer]');
  await viz
    .getByRole('group', { name: 'Layer' })
    .getByRole('button', { name: /Output layer/ })
    .click();
  await expect(viz).toHaveAttribute('data-forward-layer', '2');

  const code = page.locator('[data-layer-code="forward-numpy"]');
  await expect(code.locator('[data-layer-line]')).toHaveCount(4);
  await expect(code.locator('[data-layer-line]').nth(2)).toContainText('Z2 = A1 @ W2 + b2');
  await expect(code.locator('[data-layer-line]').nth(3)).toContainText('A2 = 1 / (1 + np.exp(-Z2))');
  await expect(code).toContainText('Marked: output layer');

  const shapes = page.locator('[data-forward-shapes] li[data-selected]');
  await expect(shapes).toHaveCount(2);
  await expect(shapes.first()).toContainText('(4, 3) @ (3, 1) + (1,) → (4, 1)');

  // Z2[0][0] = 2·tanh(-1) - 2·tanh(-3) + 0.5·0 - 1.5 = -1.0331, σ(-1.0331) = 0.2625
  await expect(viz.locator('[data-forward-arithmetic]')).toContainText('= -1.0331');
  await expect(viz.locator('[data-forward-arithmetic]')).toContainText(
    'A2[0][0] = Sigmoid(-1.0331) = 0.2625',
  );

  await viz
    .getByRole('group', { name: 'Layer' })
    .getByRole('button', { name: /Input layer/ })
    .click();
  await expect(code.locator('[data-layer-line]')).toHaveCount(1);
  await expect(code.locator('[data-layer-line]')).toContainText('X = np.array(');
});

test('editing a weight changes the diagram, the code literal, the trace and the readout together', async ({
  page,
}) => {
  const viz = page.locator('[data-forward-layer]');
  await viz.getByRole('textbox', { name: 'W1[0][0]' }).fill('3');
  await viz.getByRole('group', { name: 'Example' }).getByRole('button', { name: 'row 2' }).click();

  // Row 2 is X[2] = [1, 0]: Z1[2][0] = 1·3 + 0·2 + (-1) = 2
  await expect(viz.locator('[data-forward-arithmetic]')).toContainText(
    'Z1[2][0] = X[2][0]·W1[0][0] + X[2][1]·W1[1][0] + b1[0] = 1·3 + 0·2 + (-1) = 2',
  );
  await expect(viz.getByRole('img', { name: /output 0.9115/ })).toBeVisible();

  await expect(page.locator('[data-code-example="forward-numpy"]')).toContainText(
    'W1 = np.array([[3.0, 2.0, 1.0], [2.0, 2.0, -1.0]])',
  );
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText(
    '[[0.2625], [0.7623], [0.9115], [0.2641]]',
  );

  const step = page.locator('[data-step-through="forward-numpy"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 5; i++) await next.click();
  await expect(step.getByText('Step 6 of 11')).toBeVisible();
  await expect(step.locator('[data-active-line]')).toContainText('Z1 = X @ W1 + b1');
  await expect(step).toContainText(
    'Z1[0][0] = X[0][0]·W1[0][0] + X[0][1]·W1[1][0] + b1[0] = 0·3 + 0·2 + (-1) = -1',
  );
});

test('the batch size changes every shape, the code comments and the printout', async ({ page }) => {
  const exp = page
    .locator('[data-experiment="forward"]')
    .filter({ has: page.getByRole('slider') })
    .first();
  const slider = exp.getByRole('slider', { name: 'Batch size (rows of X)' });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-forward-shapes]')).toContainText('(2, 2) @ (2, 3) + (3,) → (2, 3)');
  await expect(page.locator('[data-code-example="forward-numpy"]')).toContainText(
    '# (2, 2): 2 examples, 2 features each',
  );
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('(2, 1)');
  await expect(readout).toContainText('[[0.2625], [0.7623]]');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="forward-numpy"] [class*="kw"]').first().waitFor();
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

  test('the list-based forward pass prints the lesson values and the exercise passes', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'forward_lists.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      '[[-1.0, -3.0, 0.0], [1.0, -1.0, -1.0], [1.0, -1.0, 1.0], [3.0, 1.0, 0.0]]\n[[0.2625], [0.7623], [0.8729], [0.2625]]',
      { timeout: 90_000 },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(denseExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
