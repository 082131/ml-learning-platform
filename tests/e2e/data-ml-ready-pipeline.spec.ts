import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'capstone/ml-ready-pipeline', 'Capstone: a reliable pipeline');
});

test('the brief lists eight milestones and the reference output shows an unchanged rerun', async ({
  page,
}) => {
  await expect(page.locator('#section-practice').getByRole('checkbox')).toHaveCount(8);
  const output = page.locator('[data-code-example="capstone-pipeline-output"]');
  await expect(output).toContainText('# 2026-10-10  loaded 10  quarantined 1');
  await expect(output).toContainText("('negative amount', 2)");
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'capstone-pipeline-code');
});
