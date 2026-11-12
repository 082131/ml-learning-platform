import AxeBuilder from '@axe-core/playwright';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

/** Opens an ML data operations lesson and waits for its title. */
export async function openDataOpsLesson(page: Page, context: BrowserContext, id: string, title: string) {
  await servePyodideLocally(context);
  await page.goto(`./#/learn/dataops/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
}

/** The experiment with controls, the linked Python listing, and what the listing prints. */
export function experimentParts(page: Page, experimentId: string, codeId: string) {
  return {
    viz: page.locator(`[data-experiment="${experimentId}"]`).filter({ has: page.getByRole('combobox') }),
    code: page.locator(`[data-code-example="${codeId}"]`),
    readout: page.getByRole('region', { name: 'What the code prints' }),
  };
}

/**
 * Axe finds no serious or critical issues in either theme, and the page does not scroll sideways. `ready` is a
 * selector that is present once the page has rendered its code. Colour transitions finish before each scan, so the
 * contrast check sees the final theme.
 */
export async function expectAccessibleInBothThemes(page: Page, ready: string) {
  await page.locator(ready).first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
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
