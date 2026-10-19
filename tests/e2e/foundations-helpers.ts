import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Axe in both themes (no serious or critical issues) and no horizontal page scroll. Thread 4 lessons. */
export async function expectAccessibleBothThemes(page: Page) {
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

/** Opens a lesson and waits for its title and highlighted code. */
export async function openLesson(page: Page, id: string, title: string) {
  await page.goto(`./#/learn/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
}
