import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'cloud/storage-permissions-cost', 'Cloud storage, permissions, cost');
});

test('reading only recent data cuts the query cost in the line items, the code and the printout', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="cost"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="cost-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-cost-total]')).toHaveText('45,138.00');
  await expect(readout).toContainText('storage $138.00 + queries $45,000.00 = $45,138.00 per month');

  await viz.getByLabel('Each query reads').selectOption('recent');
  await expect(code).toContainText('SCAN = "recent"');
  await expect(viz.locator('[data-item="queries"]')).toContainText('875.00');
  await expect(viz.locator('[data-cost-total]')).toHaveText('1,013.00');
  await expect(readout).toContainText('storage $138.00 + queries $875.00 = $1,013.00 per month');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'cost-python');
});
