import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const LESSON = './#/learn/ml/deep/training-loop';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('training loop');
});

const controls = (page: Page) =>
  page.locator('[data-experiment="training-loop"]').filter({ has: page.getByRole('slider') });

test('changing the batch size updates the code, the readout, the curves and the step-through together', async ({
  page,
}) => {
  const readout = page.getByRole('region', { name: 'Run summary' }).first();
  await expect(readout).toContainText('ceil(100 / 10) = 10');
  await expect(readout).toContainText('50 × 10 = 500');

  const batch = controls(page).getByRole('slider', { name: 'Batch size B' });
  await batch.focus();
  // 10 → 16 → 20 → 25 → 32
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(batch).toHaveAttribute('aria-valuetext', '32');
  await expect(readout).toContainText('ceil(100 / 32) = 4 (last batch: 4)');
  await expect(readout).toContainText('50 × 4 = 200');
  await expect(page.locator('[data-code-example="training-loop-ts"]')).toContainText(
    'const stepsPerEpoch = Math.ceil(n / 32);',
  );
  await expect(page.locator('[data-viz="Mini-batch loss per iteration"] figcaption')).toContainText(
    '200 iterations: 4 per epoch × 50 epochs, batch size 32',
  );

  const step = page.locator('[data-step-through="training-loop-ts"]');
  await expect(step).toContainText('Computed in your browser');
  for (let i = 0; i < 4; i++) await step.getByRole('button', { name: 'Next' }).click();
  await expect(step).toContainText('stepsPerEpoch = ceil(100 / 32) = 4. The last batch holds 4 examples.');
});

test('a different seed or dataset retrains the network and redraws the boundary', async ({ page }) => {
  const boundary = page.locator('[data-viz="Decision boundary"]');
  const caption = boundary.locator('figcaption');
  const before = await caption.textContent();
  await controls(page).getByRole('combobox', { name: 'Dataset' }).selectOption('circles');
  await expect(caption).not.toHaveText(before!);
  await expect(page.locator('[data-code-example="training-loop-ts"]')).toContainText(
    "makeSplit('circles', 1)",
  );
  const seed = controls(page).getByRole('spinbutton', { name: 'Seed' });
  await seed.fill('7');
  await seed.press('Tab');
  await expect(page.locator('[data-code-example="training-loop-ts"]')).toContainText(
    "makeSplit('circles', 7)",
  );
  await boundary.getByRole('button', { name: 'Show table' }).click();
  await expect(boundary.getByRole('table')).toContainText('Validation');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="training-loop-ts"] [class*="kw"]').first().waitFor();
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
