import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/ml/deep/optimizers';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('optimizers');
});

const controls = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="optimizer-race"]').filter({ has: page.getByRole('slider') });

test('the inspected step links the equations, the Adam code, its trace and the race', async ({ page }) => {
  // Step 1 on the bowl: Adam moves exactly η = 0.2 against the sign of each gradient.
  const adamCard = page.locator('[data-update="adam"]').first();
  await expect(adamCard).toContainText('(−4, 1.5) − 0.2·(−1, 1) = (−3.8, 1.3)');
  await expect(page.locator('[data-update="sgd"]').first()).toContainText(
    '(−4, 1.5) − 0.05·(−4, 15) = (−3.8, 0.75)',
  );

  const inspect = controls(page).getByRole('slider', { name: 'Inspect step t' });
  await inspect.focus();
  await page.keyboard.press('ArrowRight');
  // Step 2: momentum overshoots y = 0.
  await expect(page.locator('[data-update="momentum"]').first()).toContainText(
    '0.9·(−4, 15) + (−3.8, 7.5) = (−7.4, 21)',
  );
  await expect(page.locator('[data-update="momentum"]').first()).toContainText('= (−3.43, −0.3)');
  await expect(page.locator('[data-code-example="optimizers-adam"]')).toContainText(
    'for t in range(1, 2 + 1):',
  );

  const step = page.locator('[data-step-through="optimizers-adam"]');
  await expect(step).toContainText('Computed in your browser');
  // Setup (5 steps), iteration 1 summarized, then t = 2: g, m, v, m_hat is the 11th step.
  for (let i = 0; i < 10; i++) await step.getByRole('button', { name: 'Next' }).click();
  await expect(step).toContainText('1 − β₁^2 = 0.19');
});

test('a learning rate above 0.2 makes SGD diverge, and the race, the readout and the loss chart say so', async ({
  page,
}) => {
  const lr = controls(page).getByRole('slider', { name: 'Learning rate η (SGD and momentum)' });
  await lr.focus();
  // 0.05 → 0.1 → 0.15 → 0.2 → 0.25
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(lr).toHaveAttribute('aria-valuetext', '0.25');
  const race = page.locator('[data-viz="Optimizer race"]');
  await expect(race.getByRole('status')).toContainText('SGD diverged at step 15');
  await expect(race.locator('[data-path="sgd"]')).toHaveAttribute('data-status', 'diverged');
  await expect(race.locator('[data-path="momentum"]')).toHaveAttribute('data-status', 'ok');
  const readout = page.getByRole('region', { name: 'Where the race ends' }).first();
  await expect(readout).toContainText('Diverged: left the safe range (|value| > 1e6) at step 15');
});

test('switching to Rosenbrock resets the learning rates and changes the code literals', async ({ page }) => {
  await controls(page).getByRole('combobox', { name: 'Loss surface' }).selectOption('rosenbrock');
  await expect(page.locator('[data-race-surface]')).toHaveAttribute('data-race-surface', 'rosenbrock');
  const code = page.locator('[data-code-example="optimizers-adam"]');
  await expect(code).toContainText('lr, beta1, beta2, eps = 0.1, 0.9, 0.999, 1e-8');
  await expect(code).toContainText('theta = np.array([-1.2, 1.0])');
  await expect(page.locator('[data-update="sgd"]').first()).toContainText('∇f(−1.2, 1) = (−215.6, −88)');
  // Table alternative
  const race = page.locator('[data-viz="Optimizer race"]');
  await race.getByRole('button', { name: 'Show table' }).click();
  await expect(race.getByRole('table')).toContainText('Momentum');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="optimizers-adam"] [class*="kw"]').first().waitFor();
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
