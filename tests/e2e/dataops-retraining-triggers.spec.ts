import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'pipelines/retraining-triggers', 'Continuous training');
});

test('a drift trigger retrains in the week of the shift, and a delayed accuracy trigger is late, in the chart, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'retraining', 'triggers-python');
  await expect(readout).toContainText('retrained in weeks: 13, 26, 39');
  await expect(viz.locator('[data-retrains]')).toHaveAttribute('data-retrains', '13,26,39');

  await viz.getByRole('combobox', { name: 'Retraining policy' }).selectOption('drift');
  await expect(code).toContainText('POLICY = "drift"');
  await expect(readout).toContainText('retrains: 5, mean accuracy 0.9032, worst week 0.884');
  await expect(viz.locator('[data-retrains]')).toHaveAttribute('data-retrains', '10,20,30,33,43');

  await viz.getByRole('combobox', { name: 'Retraining policy' }).selectOption('accuracy');
  await viz.getByRole('combobox', { name: 'Label delay' }).selectOption('6');
  await expect(code).toContainText('LABEL_DELAY = 6');
  await expect(readout).toContainText('retrained in weeks: 17, 34, 51');
  await expect(readout).toContainText('worst week 0.736');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="triggers-python"] [class*="kw"]');
});
