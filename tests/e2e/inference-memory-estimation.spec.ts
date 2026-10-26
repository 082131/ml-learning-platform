import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/memory/memory-estimation';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Memory, VRAM');
});

test('changing the batch size updates the bar, the code, the printout and the trace together', async ({
  page,
}) => {
  const viz = page.locator('[data-viz="Where the memory goes"]');
  await expect(viz.getByRole('status')).toContainText('Fits 16.52 GiB of 24 GiB');

  const controls = page.locator('[data-experiment="memory"]').filter({ has: page.getByRole('slider') });
  const batch = controls.getByRole('slider', { name: 'Batch size (sequences)' });
  await batch.focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');

  // 8 sequences of 8,192 tokens: KV 8.00 GiB, activations 4.50 GiB, total 27.46 GiB > 24 GiB
  await expect(viz.getByRole('status')).toContainText('Does not fit 27.46 GiB of 24 GiB');
  await expect(viz.locator('[data-part="kvCache"]')).toContainText('8.00 GiB');
  await expect(page.locator('[data-code-example="memory-estimate"]').first()).toContainText(
    'batch, seq_len = 8, 8192',
  );
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('KV cache         8.00 GiB');
  await expect(printout).toContainText('total           27.46 GiB');

  const step = page.locator('[data-step-through="memory-estimate"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 6; i++) await next.click();
  await expect(step).toContainText('2 · 32 · 8 · 128 · 8,192 · 8 · 2 = 8,589,934,592 bytes');
});

test('switching precision and model changes the weights term', async ({ page }) => {
  const controls = page.locator('[data-experiment="memory"]').filter({ has: page.getByRole('slider') });
  await controls.getByLabel('Model').selectOption('llama-3.1-70b');
  await controls.getByLabel('GPU memory').selectOption('80');
  const viz = page.locator('[data-viz="Where the memory goes"]');
  await expect(viz.locator('[data-part="weights"]')).toContainText('131.42 GiB');
  await expect(viz.getByRole('status')).toContainText('Does not fit');
  await controls.getByLabel('Weight precision').selectOption('int4');
  await expect(viz.locator('[data-part="weights"]')).toContainText('32.85 GiB');
  await expect(viz.getByRole('status')).toContainText('Fits 36.48 GiB of 80 GiB');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="memory-estimate"] [class*="kw"]').first().waitFor();
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
