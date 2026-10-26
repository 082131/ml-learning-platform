import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'statistics-intuition', 'Mean, variance'));

test('splitting by season and removing its effect changes the correlation', async ({ page }) => {
  const viz = page.locator('[data-viz="Ice cream and sunburn"]');
  // Seed 1, full season effect (values from the simulator's unit-tested computation)
  await expect(viz).toContainText('Across all days r = 0.7678.');
  await expect(page.getByText('r, summer days only')).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Season' }).selectOption('season');
  await expect(viz).toContainText('within summer r = 0.1172, within winter r = 0.1392');
  await expect(viz.getByText('summer day', { exact: true })).toBeVisible();

  const effect = page.getByRole('slider', { name: 'How much summer raises both' });
  await effect.focus();
  await page.keyboard.press('Home'); // 0%: the season no longer affects either quantity
  await expect(viz).toContainText('Across all days r = 0.1294;');
});

test('the code shows the real NumPy output for the fixed data', async ({ page }) => {
  await expect(page.locator('[data-code-example="stats-split"]')).toContainText('-0.07641607199008701');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
