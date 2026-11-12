import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ context }) => {
  await servePyodideLocally(context);
});

for (const track of ['ml', 'data', 'ai', 'inference', 'dataops']) {
  test(`the ${track} exam page shows its blueprint and certifications`, async ({ page }) => {
    await page.goto(`./#/exam/${track}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start the exam' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maps to' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test('a sitting can be answered, flagged, submitted and reviewed', async ({ page }) => {
  await page.goto('./#/exam/ml');
  await expectNoSeriousA11yIssues(page);
  await page.getByRole('button', { name: 'Start the exam' }).click();
  await expect(page.getByText('Item 1 of 100')).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Time left' })).toBeVisible();

  const item = page.locator('[data-exam-item]');
  await item.locator('input').first().check();
  await page.getByRole('button', { name: '⚐ Flag for review' }).click();
  await expect(page.getByRole('button', { name: '⚑ Unflag' })).toBeVisible();
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('Item 2 of 100')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);

  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('99 items are unanswered');
  await page.getByRole('button', { name: 'Submit and see my score' }).click();
  await expect(page.locator('[data-exam-score]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take a new sitting' })).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  await page.reload();
  await expect(page.locator('[data-exam-score]')).toBeVisible();
});

test('the hands-on tab lists graded tasks out of 100 points', async ({ page }) => {
  await page.goto('./#/exam/data');
  await page.getByRole('tab', { name: 'Hands-on' }).click();
  await expect(page.locator('[data-handson-score]')).toContainText('100');
  await expect(page.getByRole('button', { name: 'Run graded checks' }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
});
