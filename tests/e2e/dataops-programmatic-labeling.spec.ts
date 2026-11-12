import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'labeling/programmatic-labeling', 'Weak supervision');
});

test('switching on a labeling function raises coverage, in the matrix, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'programmatic', 'label-python');
  await expect(readout).toContainText('weak labels: 6/16 tickets, 0 with conflicting votes');
  await expect(viz.locator('tr[data-weak="none"]')).toHaveCount(10);

  await viz.getByRole('combobox', { name: 'money_back' }).selectOption('on');
  await expect(code).toContainText('ACTIVE = ["refund_word", "money_back"]');
  await expect(readout).toContainText('weak labels: 10/16 tickets, 0 with conflicting votes');
  await expect(readout).toContainText('weak-label accuracy on labeled tickets: 0.80');
  await expect(viz.locator('tr[data-weak="none"]')).toHaveCount(6);
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="label-python"] [class*="kw"]');
});
