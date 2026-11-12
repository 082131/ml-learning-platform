import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'labeling/label-errors', 'Finding label errors');
});

test('per-class thresholds flag fewer correct labels, in the strips, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'label-errors', 'find-issues-python');
  await expect(readout).toContainText('flagged 6, really wrong 4: precision 0.67');
  await expect(viz.locator('[data-flagged="true"]')).toHaveCount(6);

  await viz.getByRole('combobox', { name: 'Flag an item when' }).selectOption('per-class');
  await expect(code).toContainText('METHOD = "per-class"');
  await expect(readout).toContainText('thresholds: cat 0.719, dog 0.499');
  await expect(readout).toContainText('flagged 4, really wrong 4: precision 1.00, recall 0.80');
  await expect(viz.locator('[data-flagged="true"]')).toHaveCount(4);
  await expect(viz.locator('[data-flagged="true"][data-wrong="false"]')).toHaveCount(0);
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="find-issues-python"] [class*="kw"]');
});
