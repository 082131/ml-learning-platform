import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/ml/deep/pytorch-basics';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('PyTorch');
});

test('the PyTorch trace is labeled simulated and shows the recorded values', async ({ page }) => {
  const step = page.locator('[data-step-through="pytorch-tiny-net"]');
  await expect(step.getByText('Simulated trace', { exact: true })).toBeVisible();
  await expect(step).toContainText(
    'recorded from a run of PyTorch 2.14.1 on CPU; nothing runs in your browser',
  );
  await expect(step).not.toContainText('written out by hand');
  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('tensor([0.5315, 0.5023, 0.4945, 0.4813])');
  await expect(page.locator('[data-code-example="pytorch-tiny-net"]')).toContainText('0 0.70559');
});

test('the TypeScript twin matches the recorded run, and retrains when the controls change', async ({
  page,
}) => {
  const exp = page.locator('[data-experiment="tiny-net"]');
  const readout = exp.getByRole('region', { name: 'What the TypeScript run prints' });
  await expect(readout).toContainText('0 0.70559 · 1 0.704199 · 2 0.702961');
  await expect(readout).toContainText('[0.5315, 0.5023, 0.4945, 0.4813]');
  await expect(readout).toContainText(/largest difference \d\.\de-8/);

  const lr = exp.getByRole('slider', { name: 'Learning rate (lr)' });
  await lr.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight'); // 0.5 → 1 → 2
  const steps = exp.getByRole('slider', { name: 'Training steps' });
  await steps.focus();
  await page.keyboard.press('End');
  await expect(exp.locator('[data-code-example="pytorch-ts-twin"]')).toContainText('step < 300');
  await expect(exp.locator('[data-code-example="pytorch-ts-twin"]')).toContainText('sgdStep(net, grads, 2)');
  await expect(readout).toContainText('recorded only for lr = 0.5 and 3 steps');
  await expect(readout).toContainText('[0.0043, 0.9924');
  await expect(exp.locator('[data-viz="XOR loss per step"] figcaption')).toContainText('at step 299');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="pytorch-tiny-net"] [class*="kw"]').first().waitFor();
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
