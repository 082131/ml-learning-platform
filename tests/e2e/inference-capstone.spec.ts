import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./#/learn/inference/capstone/deploy-benchmark');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Capstone: deploy, benchmark and optimize',
  );
});

test('the brief lists its milestones and a ticked milestone is remembered', async ({ page }) => {
  const milestones = page.getByRole('group', { name: /Milestones/ }).getByRole('checkbox');
  await expect(milestones).toHaveCount(8);
  await milestones.first().check();
  await expect(page.getByRole('group', { name: /Milestones · 1 of/ })).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole('group', { name: /Milestones/ })
      .getByRole('checkbox')
      .first(),
  ).toBeChecked();
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example] [class*="kw"]').first().waitFor();
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
