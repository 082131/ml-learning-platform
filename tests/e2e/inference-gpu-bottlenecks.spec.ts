import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/perf/gpu-bottlenecks';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'GPU utilization and bottleneck analysis',
  );
});

test('batching moves a linear layer from memory-bound to compute-bound; attention does not move', async ({
  page,
}) => {
  const chart = page.locator('[data-roofline-bound]').first();
  await expect(chart).toHaveAttribute('data-roofline-bound', 'memory');
  await expect(chart).toHaveAttribute('data-intensity', '1.00');

  const controls = page.locator('[data-experiment="roofline"]').filter({ has: page.getByRole('slider') });
  const batch = controls.getByRole('slider', { name: 'Batch (rows or sequences)' });
  await batch.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await expect(chart).toHaveAttribute('data-roofline-bound', 'compute');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText(
    '32.5 us, compute-bound, 84.6%',
  );

  await controls.getByRole('combobox', { name: 'Operation' }).selectOption('attention');
  await expect(chart).toHaveAttribute('data-intensity', '1.00');
  await expect(chart).toHaveAttribute('data-roofline-bound', 'memory');
});

test('overlapping CPU preprocessing raises GPU utilization', async ({ page }) => {
  const timeline = page.locator('[data-stall-util]').first();
  await expect(timeline).toHaveAttribute('data-stall-util', '38.5');
  const controls = page.locator('[data-experiment="stall"]').filter({ has: page.getByRole('slider') });
  await controls
    .getByRole('combobox', { name: 'Prepare the next batch while the GPU works' })
    .selectOption('yes');
  await expect(timeline).toHaveAttribute('data-stall-util', '62.5');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('4,000 images/s');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="roofline-model"] [class*="kw"]').first().waitFor();
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
