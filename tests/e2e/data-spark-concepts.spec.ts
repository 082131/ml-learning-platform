import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'distributed/spark-concepts', 'Distributed processing with Spark');
});

test('skew overloads one task, and a broadcast join removes the shuffle, in the stages, code and printout', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="shuffle"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="shuffle-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-stage="2"] [data-task]')).toHaveCount(4);
  await expect(viz.locator('[data-shuffle]')).toHaveAttribute('data-shuffle', '24');
  await expect(readout).toContainText('stage 2: 4 tasks read [8, 4, 4, 8] records');

  await viz.getByLabel('Keys').selectOption('on');
  await expect(code).toContainText('SKEW = True');
  await expect(viz.locator('[data-stage="2"] [data-records="16"]')).toHaveCount(1);
  await expect(readout).toContainText('time: 8 + 16 = 24 units');

  await viz.getByLabel('Operation').selectOption('broadcast');
  await expect(code).toContainText('"broadcast"');
  await expect(viz.locator('[data-stage="2"]')).toHaveCount(0);
  await expect(readout).toContainText('nothing moves');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'shuffle-python');
});
