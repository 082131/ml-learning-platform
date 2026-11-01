import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'features/training-serving', 'Feature pipelines and training-serving');
});

test('only the as-of join leaks nothing, in the timelines, the code and the printout', async ({ page }) => {
  const viz = page.locator('[data-experiment="point"]').filter({ has: page.getByRole('combobox') });
  const code = page.locator('[data-code-example="point-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-example][data-leak="true"]')).toHaveCount(5);
  await expect(code).toContainText('JOIN = "latest"');
  await expect(readout).toContainText('5 of 6 training rows use information from the future');

  await viz.getByLabel('Training rows get the snapshot').selectOption('same-day');
  await expect(code).toContainText('JOIN = "same-day"');
  await expect(viz.locator('[data-example="B-15"]')).toHaveAttribute('data-leak', 'true');
  await expect(readout).toContainText(
    'B day 15: feature=1 label=1  <- from day 15; at prediction time it was 0',
  );

  await viz.getByLabel('Feature window').selectOption('3');
  await expect(code).toContainText('WINDOW = 3');
  await expect(viz.locator('[data-example][data-leak="true"]')).toHaveCount(2);

  await viz.getByLabel('Training rows get the snapshot').selectOption('as-of');
  await expect(viz.locator('[data-example][data-leak="true"]')).toHaveCount(0);
  await expect(readout).toContainText('0 of 6 training rows use information from the future');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'point-python');
});
