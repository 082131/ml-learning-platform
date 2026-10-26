import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const CAPSTONES = [
  { id: 'capstone-classification', heading: 'classification', milestones: 8 },
  { id: 'capstone-neural-net', heading: 'neural network', milestones: 7 },
];

for (const c of CAPSTONES) {
  test.describe(c.id, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`./#/learn/ml/projects/${c.id}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(c.heading);
    });

    test('the brief lists its milestones and a ticked milestone is remembered', async ({ page }) => {
      const milestones = page.getByRole('group', { name: /Milestones/ }).getByRole('checkbox');
      await expect(milestones).toHaveCount(c.milestones);
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
  });
}
