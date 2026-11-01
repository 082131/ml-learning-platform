import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'python-sql/formats-sql-intro', 'Python for data, SQL');
});

test('changing the query changes the table, the Python and its printout together', async ({ page }) => {
  const viz = page.locator('[data-experiment="sql"]').filter({ has: page.getByRole('combobox') });
  const code = page.locator('[data-code-example="sql-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-row][data-kept="true"]')).toHaveCount(5);
  await expect(code).toContainText('WHERE amount >= 15');
  await expect(readout).toContainText("(7, 'Austin', 'coffee', 40)");

  await viz.getByLabel('GROUP BY (one row per group)').selectOption('city');
  await expect(code).toContainText('GROUP BY city');
  await expect(readout).toContainText("('Leeds', 2, 45)");
  await expect(readout).toContainText('5 rows pass the filter and collapse into 3 groups');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'sql-python');
});
