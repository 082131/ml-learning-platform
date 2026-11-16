import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { screens } from '../../content/interview/screens';
import { servePyodideLocally } from './pyodide';

async function expectNoSeriousA11yIssues(page: Page) {
  // Colour transitions in the middle of a theme change give false contrast failures.
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ context, page }) => {
  await servePyodideLocally(context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('questions can be filtered, revealed and self-rated, and the rating is kept', async ({ page }) => {
  await page.goto('./#/interview');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Practice the interview');
  const all = Number(await page.locator('[data-shown]').getAttribute('data-shown'));
  expect(all).toBeGreaterThanOrEqual(70);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);

  await page.getByRole('group', { name: 'Role' }).getByRole('button', { name: 'ML', exact: true }).click();
  await expect(page).toHaveURL(/role=ml/);
  await page
    .getByRole('group', { name: 'Question type' })
    .getByRole('button', { name: 'System design' })
    .click();
  const shown = Number(await page.locator('[data-shown]').getAttribute('data-shown'));
  expect(shown).toBeGreaterThanOrEqual(2);
  expect(shown).toBeLessThan(all);

  const card = page.locator('[data-question]').first();
  await expect(card.getByRole('region', { name: 'Model answer' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Reveal model answer' }).click();
  await expect(card.getByRole('region', { name: 'Model answer' })).toBeVisible();
  await card.getByRole('checkbox').first().check();
  await expect(card).toContainText('you covered 1 of');
  await card.getByRole('button', { name: 'Partly' }).click();
  await expect(card).toHaveAttribute('data-rating', '2');
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);

  await page.reload();
  await page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Needs work' }).click();
  await expect(page.locator('[data-question]')).toHaveCount(1);
  await expect(page.locator('[data-question]').first()).toHaveAttribute('data-rating', '2');
});

test('a mock round asks five questions one at a time', async ({ page }) => {
  await page.goto('./#/interview?role=behavioral');
  await page.getByRole('button', { name: 'Start a 5-question mock round' }).click();
  await expect(page.getByText('question 1 of 5')).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Time on this question' })).toBeVisible();
  await expect(page.locator('[data-question]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reveal model answer' }).click();
  await page.getByRole('button', { name: 'Nailed it' }).click();
  await expectNoSeriousA11yIssues(page);
  await page.getByRole('button', { name: 'Next question →' }).click();
  await expect(page.getByText('question 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'End round' }).click();
  await expect(page.getByRole('definition').nth(1)).toHaveText('1');
});

test('the dark theme and the loop guide have no contrast or overflow problems', async ({ page }) => {
  await page.goto('./#/interview?tab=guide');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.getByRole('heading', { name: 'A 45-minute system design round' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
  await page.getByRole('tab', { name: 'Questions' }).click();
  await page.locator('[data-question]').first().getByRole('button', { name: 'Reveal model answer' }).click();
  await expectNoSeriousA11yIssues(page);
});

test('a coding screen runs against the clock, locks on submit and shows solutions', async ({ page }) => {
  await page.goto('./#/interview?tab=screens');
  await expect(page.locator('[data-screen]')).toHaveCount(screens.length);
  await expectNoHorizontalScroll(page);
  await page.locator('[data-screen="python"]').getByRole('link', { name: 'Open screen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Python coding screen');
  await expectNoSeriousA11yIssues(page);

  await page.getByRole('button', { name: 'Start the 45-minute screen' }).click();
  await expect(page.getByRole('timer', { name: 'Time left' })).toHaveText(/^4[45]:\d\d$/);
  await expect(page.getByText('Reference solution')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reveal solution/ })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);

  await page.reload();
  await expect(page.getByRole('timer', { name: 'Time left' })).toBeVisible();

  await page.getByRole('button', { name: 'Submit screen' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Submit with 0 of 100 points');
  await page.getByRole('button', { name: 'Submit and see my result' }).click();
  await expect(page.locator('[data-screen-result]')).toHaveAttribute('data-screen-result', '0');
  await expect(page.getByText('Reference solution').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run graded checks' }).first()).toBeDisabled();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);

  await page.getByRole('button', { name: 'Start a new sitting' }).click();
  await expect(page.getByRole('button', { name: 'Start the 45-minute screen' })).toBeVisible();
  await expect(page.getByText('Past sittings')).toBeVisible();
});

test('the sitting ends by itself when time runs out', async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/interview/screen/data');
  await page.getByRole('button', { name: 'Start the 50-minute screen' }).click();
  await expect(page.getByRole('timer', { name: 'Time left' })).toBeVisible();
  await page.clock.fastForward('51:00');
  await expect(page.locator('[data-screen-result]')).toBeVisible();
  await expect(page.getByText('Used 50:00 of 50:00')).toBeVisible();
});

// Every reference solution must also pass in the browser's Python, where the learner actually runs it.
for (const screen of screens) {
  test(`${screen.id} screen: reference solutions score 100 in Pyodide @network`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one browser run per screen is enough');
    test.setTimeout(300_000);
    await page.goto(`./#/interview/screen/${screen.id}`);
    await page.getByRole('button', { name: /^Start the/ }).click();
    for (const [i, task] of screen.tasks.entries()) {
      const article = page.locator(`[data-task="${task.id}"]`);
      await article.getByRole('button', { name: 'Run graded checks' }).click();
      await expect(article.locator('[data-state="fail"]').first()).toBeVisible({ timeout: 180_000 });
      await expect(article.locator('[data-state="pass"]')).toHaveCount(0);
      await article.getByLabel(`Task ${i + 1} code editor`).fill(task.solution);
      await article.getByRole('button', { name: 'Run graded checks' }).click();
      await expect(article.locator('[data-state="pass"]')).toHaveCount(task.checks.length, {
        timeout: 180_000,
      });
    }
    await expect(page.locator('[data-screen-score]')).toHaveAttribute('data-screen-score', '100');
    await page.getByRole('button', { name: 'Submit screen' }).click();
    await page.getByRole('button', { name: 'Submit and see my result' }).click();
    await expect(page.locator('[data-screen-result]')).toHaveAttribute('data-screen-result', '100');
  });
}
