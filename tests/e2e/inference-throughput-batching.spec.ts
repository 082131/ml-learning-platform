import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/throughput/batching-throughput';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Batching, dynamic batching');
});

test('changing max batch updates the charts, the code, the printout and the trace together', async ({
  page,
}) => {
  const sim = page.locator('[data-p95]');
  await expect(sim).toHaveAttribute('data-p95', '67.2');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('p95 latency    67.2 ms');

  const controls = page.locator('[data-experiment="batching"]').filter({ has: page.getByRole('slider') });
  const maxBatch = controls.getByRole('slider', { name: 'Max batch size' });
  await maxBatch.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');

  // max_batch 3 at 100 req/s: capacity 103.4 req/s, so the replica only just keeps up
  await expect(page.locator('[data-code-example="batching-sim"]')).toContainText(
    'max_batch, max_wait = 3, 10',
  );
  await expect(printout).toContainText('p95 latency   411.4 ms');
  await expect(printout).toContainText('GPU busy      98.8%');
  await expect(sim).toHaveAttribute('data-p95', '411.4');

  const step = page.locator('[data-step-through="batching-sim"]');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 5; i++) await next.click();
  await expect(step).toContainText('start = max(0.00, min(38.44, 0.12 + 10)) = 10.12 ms');
});

test('pushing the rate past capacity reports overload', async ({ page }) => {
  const controls = page.locator('[data-experiment="batching"]').filter({ has: page.getByRole('slider') });
  const maxBatch = controls.getByRole('slider', { name: 'Max batch size' });
  await maxBatch.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  const rate = controls.getByRole('slider', { name: 'Arrival rate (requests/s)' });
  await rate.focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('Overloaded');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText(
    'p95 latency  1426.7 ms',
  );
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="batching-sim"] [class*="kw"]').first().waitFor();
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
