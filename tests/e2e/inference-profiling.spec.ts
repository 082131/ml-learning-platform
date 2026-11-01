import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/perf/profiling';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Latency, throughput and memory profiling',
  );
});

test('warm-up and synchronization change the benchmark result', async ({ page }) => {
  const hist = page.locator('[data-p99]').first();
  await expect(hist).toHaveAttribute('data-p99', '52.99');
  await expect(hist).toHaveAttribute('data-mean', '17.49');

  const controls = page.locator('[data-experiment="bench"]').filter({ has: page.getByRole('slider') });
  const warmup = controls.getByRole('slider', { name: 'Warm-up calls' });
  await warmup.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expect(hist).toHaveAttribute('data-p99', '17.79');
  await expect(hist).toHaveAttribute('data-mean', '12.58');

  await controls.getByRole('combobox', { name: 'Synchronize before stopping the timer' }).selectOption('no');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('0.25');
});

test('an open-loop client sees the freeze that a closed-loop client hides', async ({ page }) => {
  const chart = page.locator('[data-omission-p99]').first();
  await expect(chart).toHaveAttribute('data-omission-p99', '10.0');
  const controls = page.locator('[data-experiment="omission"]').filter({ has: page.getByRole('slider') });
  await controls.getByRole('combobox', { name: 'Load generator' }).selectOption('open');
  await expect(chart).toHaveAttribute('data-omission-p99', '985.1');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="bench-harness"] [class*="kw"]').first().waitFor();
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
