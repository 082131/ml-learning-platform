import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'ingestion/apis-formats', 'APIs, JSON, CSV, Parquet');
});

test('a crash with appends duplicates rows, and upserts fix it, in the log, the code and the printout', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="ingest"]').filter({ has: page.getByRole('combobox') });
  const code = page.locator('[data-code-example="ingest-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('li[data-kind="retry"]')).toHaveCount(2);
  await expect(readout).toContainText('rows: 23, distinct ids: 23, waited 3s');

  await viz.getByLabel('What goes wrong').selectOption('crash');
  await expect(code).toContainText('"crash"');
  await expect(viz.locator('li[data-kind="crash"]')).toHaveCount(1);
  await expect(viz.locator('[data-ingest-ids] [data-copies="2"]')).toHaveCount(15);
  await expect(readout).toContainText('rows: 38, distinct ids: 23, waited 0s');

  await viz.getByLabel('How rows are written').selectOption('upsert');
  await expect(code).toContainText('"upsert"');
  await expect(viz.locator('[data-ingest-ids] [data-copies="2"]')).toHaveCount(0);
  await expect(readout).toContainText('rows: 23, distinct ids: 23, waited 0s');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'ingest-python');
});
