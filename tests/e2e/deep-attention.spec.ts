import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { softmaxExercise } from '../../content/tracks/ml/deep/attention/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/attention';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Attention');
});

const controls = (page: Page) =>
  page.locator('[data-experiment="attn"]').filter({ has: page.getByRole('combobox', { name: 'Mask' }) });
const heatmap = (page: Page) => page.locator('[data-viz="Attention weights"]');

test('editing X[0][0] changes the heatmap, the row arithmetic, the code literal, the trace and the printout', async ({
  page,
}) => {
  await controls(page).getByRole('textbox', { name: 'X[0][0]' }).fill('2');

  // X[0] = (2, 0, 1): q0 = (3, -1), k0 = (2, 2), v0 = (4, 1). NumPy: weights[0] ≈ [0.2447 0.2447 0.4962 0.0145].
  const row0 = heatmap(page).locator('[data-row="0"]');
  await expect(row0.locator('[data-cell="0,0"]')).toHaveText('0.24');
  await expect(row0.locator('[data-cell="0,2"]')).toHaveText('0.50');
  const math = page.locator('[data-row-math="0"]');
  await expect(math).toContainText('the: q·k = 3·2 + (-1)·2 = 4; ÷ √2 (1.4142) = 2.8284');

  await expect(page.locator('[data-code-example="attn-code"]')).toContainText(
    'X = np.array([[2, 0, 1], [0, 2, 0], [1, 1, 0], [0, 1, 1]])',
  );
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('[1.504 1.259]');

  const step = page.locator('[data-step-through="attn-code"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 4; i++) await next.click();
  await expect(step).toContainText('The query of "the" is (3, -1).');
});

test('selecting a token explains its row in the visual, the code and the readout', async ({ page }) => {
  const cat = heatmap(page).getByRole('button', { name: 'cat' });
  await cat.click();
  await expect(cat).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-row-math="1"]')).toContainText('out[1][0] =');
  await expect(
    page
      .locator('[data-viz^="Row 1"] [data-matrix="Q"]')
      .getByRole('rowheader', { name: 'row 1 (highlighted)' }),
  ).toBeVisible();
  await expect(page.locator('[data-code-example="attn-code"]')).toContainText('print(np.round(out[1], 3))');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('[1.804 1.804]');
});

test('the causal mask hides later tokens everywhere', async ({ page }) => {
  await controls(page).getByRole('combobox', { name: 'Mask' }).selectOption('causal');
  const row0 = heatmap(page).locator('[data-row="0"]');
  await expect(row0.locator('[data-cell="0,0"]')).toHaveText('1.00');
  await expect(row0.locator('[data-cell="0,1"]')).toHaveText('masked');
  await expect(page.locator('[data-row-math="0"]')).toContainText('cat: masked (j > i) → −∞');
  await expect(page.locator('[data-code-example="attn-code"]')).toContainText(
    'np.tril(np.ones(scores.shape))',
  );
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('[3. 1.]');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="attn-code"] [class*="kw"]').first().waitFor();
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

  test('the softmax exercise fails on the starter and passes with the solution', async ({ page }) => {
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toBeVisible({ timeout: 90_000 });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(softmaxExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
