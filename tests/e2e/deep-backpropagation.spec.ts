import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { numericExercise } from '../../content/tracks/ml/deep/backpropagation/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/backpropagation';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Loss and backpropagation');
});

const flow = (page: Page) => page.locator('[data-backprop-stage]');

test('stepping through shows the forward values, then gradients flowing backwards', async ({ page }) => {
  const viz = flow(page);
  await expect(viz).toHaveAttribute('data-backprop-stage', 'z1');
  await expect(viz.locator('[data-backprop-arithmetic]')).toContainText(
    'z1[0] = 0.5·0.1 + (-1)·0.4 + 0 = -0.35',
  );
  await expect(viz.locator('[data-unit="1:0"]')).toContainText('?');

  const next = viz.getByRole('button', { name: 'Next ▶' });
  for (let i = 0; i < 7; i++) await next.click();
  await expect(viz).toHaveAttribute('data-backprop-stage', 'dW2');
  await expect(viz).toHaveAttribute('data-backprop-phase', 'backward');
  await expect(viz.locator('[data-backprop-arithmetic]')).toContainText(
    '∂L/∂W2[0] = (-0.3364) · (-0.2219) = 0.0746',
  );
  await expect(viz.locator('[data-unit="1:0"]')).toContainText('-0.3364');
  await expect(viz.locator('[data-unit="2:0"]')).toContainText('g -0.2219');
  await expect(viz.locator('svg')).toContainText('g 0.0746');

  await viz
    .getByRole('combobox', { name: /Step 8 of 15/ })
    .selectOption({ label: '15. Update: The loss after the step' });
  await expect(viz.locator('[data-backprop-arithmetic]')).toContainText(
    'L before = 0.2012, L after = 0.1493: lower',
  );
});

test('setting x[0] to 0 updates the code, the gradient check, the trace and the readout together', async ({
  page,
}) => {
  const controls = page
    .locator('[data-experiment="backprop"]')
    .filter({ has: page.getByRole('slider') })
    .first();
  const slider = controls.getByRole('slider', { name: 'Input x[0]' });
  await slider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft'); // 0.5 -> 0

  await expect(page.locator('[data-code-example="backprop-numpy"]')).toContainText(
    'X = np.array([[0.0, -1.0]])',
  );
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('loss before: 0.218960');
  await expect(readout).toContainText('loss after:  0.164063');

  // A weight whose input is 0 gets no gradient, and the numerical estimate agrees.
  const check = page.locator('[data-grad-check]');
  await expect(check).toHaveAttribute('data-grad-check', 'agree');
  await expect(check.getByRole('row', { name: /^W1\[0\]\[0\]/ })).toContainText('0.00000000');
  await expect(check.locator('tbody tr')).toHaveCount(9);

  const step = page.locator('[data-step-through="backprop-numpy"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 17; i++) await next.click();
  await expect(step.getByText('Step 18 of 25')).toBeVisible();
  await expect(step.locator('[data-active-line]')).toContainText('dW1 = X.T @ dZ1');
  await expect(step).toContainText('∂L/∂W1[0][0] = 0 · ');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="backprop-numpy"] [class*="kw"]').first().waitFor();
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

  test('the plain-Python gradient check agrees and the exercise passes', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'gradient_check.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const out = runner.getByRole('group', { name: 'Printed output' });
    await expect(out).toContainText('backprop:  0.0746384695', { timeout: 90_000 });
    await expect(out).toContainText('numerical: 0.0746384695');

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(numericExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
