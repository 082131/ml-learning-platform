import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'storage/warehouse-lake-lakehouse', 'Warehouses, lakes and lakehouses');
});

test('narrowing the query to one day changes the bars, the partitions read, the SQL and the bytes', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="lake"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="lake-sql"]');
  const readout = page.getByRole('region', { name: 'Bytes each layout reads' });

  await expect(viz.locator('[data-day][data-read="true"]')).toHaveCount(7);
  await expect(viz.locator('[data-layout="partitioned"]')).toHaveAttribute('data-bytes', '115719');
  await expect(readout).toContainText('115,719 bytes (115.7 kB) from 7 files');

  const slider = viz.getByRole('slider', { name: 'Days the query covers (ending 30 October)' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(viz.locator('[data-day][data-read="true"]')).toHaveCount(1);
  await expect(code).toContainText("'2026-10-30'");
  await expect(readout).toContainText('16,574 bytes (16.6 kB) from 1 file');
  await expect(readout).toContainText('227,952 bytes (228.0 kB) from 1 file');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'lake-sql');
});
