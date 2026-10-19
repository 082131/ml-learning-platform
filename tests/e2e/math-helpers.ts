import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Opens a lesson in the ml/math chapter and waits for its heading. */
export async function openMathLesson(page: Page, slug: string, heading: string | RegExp) {
  await page.goto(`./#/learn/ml/math/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
}

/** No serious or critical axe violations in either theme, and no horizontal page scroll. */
export async function expectAccessibleInBothThemes(page: Page) {
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
}
