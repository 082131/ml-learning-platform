import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { blockParamsExercise } from '../../content/tracks/ml/deep/transformers/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/transformers';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Transformer');
});

const controls = (page: Page) =>
  page.locator('[data-experiment="tf"]').filter({ has: page.getByRole('combobox', { name: 'd_model' }) });

test('changing d_model changes the diagram shapes, the code literal, the counts and the trace', async ({
  page,
}) => {
  await controls(page).getByRole('combobox', { name: 'd_model' }).selectOption('128');
  await expect(page.locator('[data-node="split"]')).toContainText('(2, 4, 8, 32)');
  await expect(page.locator('[data-node="up"]')).toContainText('(2, 8, 256)');

  // 4·128² + 2·128·256 + 9·128 + 256 = 65,536 + 65,536 + 1,152 + 256 = 132,480
  const readout = page.locator('#section-visual [data-readout]');
  await expect(readout).toContainText('4·128² + 2·128·256 + 9·128 + 256 = 132,480');
  await expect(readout).toContainText('(2, 8, 128) → (2, 4, 8, 32) → (2, 8, 128)');
  await expect(page.locator('[data-code-example="tf-params"]')).toContainText(
    'd_model, n_heads, d_ff = 128, 4, 256',
  );
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('132480');

  const step = page.locator('[data-step-through="tf-params"]');
  await step.getByRole('button', { name: 'Last step' }).click();
  await step.getByRole('button', { name: 'Previous' }).click();
  await expect(step).toContainText("Prints the block's parameter count: 132480.");
});

test('a head count that does not divide d_model is flagged in the diagram and the readout', async ({
  page,
}) => {
  await controls(page).getByRole('combobox', { name: 'Heads' }).selectOption('12');
  await expect(page.getByRole('status').filter({ hasText: 'Invalid head count' })).toContainText(
    'd_model = 64 is not divisible by 12 heads',
  );
  await expect(page.locator('[data-node="split"]')).toContainText('invalid split');
  await expect(page.locator('#section-visual [data-readout]')).toContainText('Error:');
});

test('selecting a stage shows its operation, shape and parameters', async ({ page }) => {
  await page.locator('[data-node="up"]').click();
  const detail = page.locator('[data-stage="up"]');
  await expect(detail).toContainText('FFN up + GELU (in each of the 2 blocks)');
  await expect(detail).toContainText('(B, T, d_ff) = (2, 8, 256)');
  await expect(detail).toContainText('d_model · d_ff + d_ff = 64 · 256 + 256 = 16,640');
  await page.locator('[data-node="scores"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-stage="scores"]')).toContainText('with the causal mask');
  await controls(page).getByRole('combobox', { name: 'Model type' }).selectOption('encoder');
  await expect(page.locator('[data-stage="scores"]')).toContainText('(no mask: encoder)');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="tf-params"] [class*="num"]').first().waitFor();
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

  test('the GPT-2 counter prints 124,439,808 and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'gpt2_params.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('7087872\n124,439,808', {
      timeout: 90_000,
    });
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('d_model=4, d_ff=16', { timeout: 60_000 });
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(blockParamsExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
