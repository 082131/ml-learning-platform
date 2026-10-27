import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { neuronExercise } from '../../content/tracks/ml/deep/neurons-activations/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/neurons-activations';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Neurons, weights, biases');
});

/** The controls shown in the Visual section (the first experiment block with sliders). */
const controls = (page: Page) =>
  page
    .locator('[data-experiment="neuron"]')
    .filter({ has: page.getByRole('slider') })
    .first();

test('raising w[0] changes the diagram, the code literal, the trace arithmetic and the readout together', async ({
  page,
}) => {
  const slider = controls(page).getByRole('slider', { name: 'Weight w[0]' });
  await slider.focus();
  await page.keyboard.press('ArrowRight'); // 0.5 -> 0.6

  // z = 0.6·1 + (-1)·2 + 0.5 = -0.9, a = σ(-0.9) = 0.2891
  const viz = page.locator('[data-neuron-z]');
  await expect(viz).toHaveAttribute('data-neuron-z', '-0.9');
  await expect(viz.locator('[data-neuron-arithmetic]')).toContainText(
    'z = w[0]·x[0] + w[1]·x[1] + b = 0.6·1 + (-1)·2 + 0.5 = 0.6 + (-2) + 0.5 = -0.9',
  );
  await expect(viz.getByRole('img', { name: /z = -0.9, a = 0.2891/ })).toBeVisible();

  const code = page.locator('[data-code-example="neuron-numpy"]');
  await expect(code).toContainText('w = np.array([0.6, -1.0])');

  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('z = -0.9000, a = 0.2891');

  const step = page.locator('[data-step-through="neuron-numpy"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 3; i++) await next.click();
  await expect(step.getByText('Step 4 of 6')).toBeVisible();
  await expect(step.locator('[data-active-line]')).toContainText('z = w @ x + b');
  await expect(step).toContainText('= 0.6 + (-2) + 0.5 = -0.9.');
});

test('switching the activation changes the code line, the output and the two-layer comparison', async ({
  page,
}) => {
  await controls(page).getByRole('combobox', { name: 'Activation f' }).selectOption('relu');
  await expect(page.locator('[data-code-example="neuron-numpy"]')).toContainText('a = np.maximum(0, z)');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText(
    'z = -1.0000, a = 0.0000',
  );
  await expect(page.locator('[data-neuron-arithmetic]')).toContainText('a = ReLU(z) = max(0, -1) = 0');

  const collapse = page.locator('[data-collapse-same]');
  await expect(collapse).toHaveAttribute('data-collapse-same', 'false');
  await expect(collapse).toContainText('y = f(h) @ W2 + b2 = 0·2 + 0.5·1 + (-0.5) = 0');
  await expect(collapse).toContainText('x @ W + c = 1·1 + 2·(-1.5) + 1 = -1');

  await controls(page).getByRole('combobox', { name: 'Activation f' }).selectOption('identity');
  await expect(collapse).toHaveAttribute('data-collapse-same', 'true');
  await expect(collapse.locator('[data-collapse-verdict]')).toContainText(
    'without an activation the two layers are exactly one linear map',
  );
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="neuron-numpy"] [class*="kw"]').first().waitFor();
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

  test('the plain-Python neuron prints its outputs and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'neuron_plain.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      'sigmoid -1.0 0.2689\ntanh -1.0 -0.7616\nrelu -1.0 0.0\nnone -1.0 -1.0',
      { timeout: 90_000 },
    );

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(neuronExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
