import AxeBuilder from '@axe-core/playwright';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

/** Opens a data-track lesson and waits for its title. */
export async function openDataLesson(page: Page, context: BrowserContext, id: string, title: string) {
  await servePyodideLocally(context);
  await page.goto(`./#/learn/data/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
}

/** Axe finds no serious or critical issues in either theme, and the page does not scroll sideways. */
export async function expectAccessibleInBothThemes(page: Page, codeExampleId: string) {
  await page.locator(`[data-code-example="${codeExampleId}"] [class*="kw"]`).first().waitFor();
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
