import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'labeling/annotation-agreement', 'Annotation guidelines');
});

test('clear guidelines raise kappa, and a lazy annotator on rare data scores kappa 0 despite high agreement', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'agreement', 'kappa-python');
  await expect(readout).toContainText("Cohen's kappa = 0.21");
  await expect(viz.locator('[data-stat="kappa"]')).toHaveAttribute('data-value', '0.21');

  await viz.getByRole('combobox', { name: 'Guidelines' }).selectOption('v2');
  await expect(readout).toContainText('disagreements: 1');
  await expect(readout).toContainText("Cohen's kappa = 0.90");
  await expect(viz.locator('tr[data-agree="false"]')).toHaveCount(1);

  await viz.getByRole('combobox', { name: 'Comments' }).selectOption('rare');
  await viz.getByRole('combobox', { name: 'Annotator B' }).selectOption('lazy');
  await expect(code).toContainText('B = [0, 0, 0');
  await expect(readout).toContainText('observed agreement p_o = 0.85');
  await expect(readout).toContainText("Cohen's kappa = 0.00");
  await expect(viz.locator('[data-stat="kappa"]')).toHaveAttribute('data-value', '0.00');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="kappa-python"] [class*="kw"]');
});
