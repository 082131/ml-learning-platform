import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./#/dev/viz');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Visualization components');
});

test('gradient descent: the learning rate changes the arithmetic, and a high rate is labeled diverged', async ({
  page,
}) => {
  const gd = page.locator('[data-experiment="demo-gd"]');
  // Defaults: f(x) = (x − 2)² + 1, x₀ = 6, η = 0.1: x₁ = 6 − 0.1 × 8 = 5.2
  await expect(gd.locator('[data-gd-step]')).toContainText("x₁ = x₀ − η·f'(x₀) = 6 − 0.1 × 8 = 5.2");
  const lr = gd.getByRole('slider', { name: 'Learning rate η' });
  await lr.fill('1.5');
  await expect(gd.locator('[data-gd-status]')).toHaveAttribute('data-gd-status', 'diverged');
  await expect(gd.getByText('Diverged', { exact: true })).toBeVisible();
  await expect(gd.getByRole('region', { name: 'Result' })).toContainText('Diverged:');
  await expect(gd.locator('[data-gd-step]')).toContainText('= 6 − 1.5 × 8 = -6');
});

test('vector plane: arrow keys move a vector and the dot product follows', async ({ page }) => {
  const plane = page.locator('[data-experiment="demo-vectors"]');
  const u = plane.getByRole('slider', { name: 'Vector u' });
  await u.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(u).toHaveAttribute('aria-valuetext', '(3, 2)');
  await expect(plane.getByRole('region', { name: 'Result' })).toContainText('3·1 + 2·2 = 7');
});

test('bar compare and flow diagram respond to the keyboard', async ({ page }) => {
  const handle = page.getByRole('slider', { name: 'Split between FP32 and INT8' });
  await handle.focus();
  await page.keyboard.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '8');
  const flow = page.locator('#flow');
  await flow.getByRole('button', { name: /^Load/ }).focus();
  await page.keyboard.press('Enter');
  await expect(flow).toContainText('Selected: load');
});

test('the visualization demo has no serious accessibility issues and no horizontal scroll', async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});
