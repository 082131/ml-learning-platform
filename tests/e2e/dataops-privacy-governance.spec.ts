import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'pipelines/privacy-governance', 'Privacy, consent');
});

test('a 4-anonymous table still reveals the diagnosis, in the groups, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'k-anonymity', 'kanon-python');
  await expect(readout).toContainText("1 matching row(s), possible diagnoses ['diabetes'] -> row identified");
  await expect(viz.locator('[data-kanon-groups]')).toHaveAttribute('data-k', '1');

  await viz.getByRole('combobox', { name: 'Age' }).selectOption('10y');
  await viz.getByRole('combobox', { name: 'Postcode' }).selectOption('3');
  await viz.getByRole('combobox', { name: 'Sex' }).selectOption('drop');
  await expect(code).toContainText('AGE = "10y"');
  await expect(code).toContainText('ZIP_DIGITS = 3');
  await expect(code).toContainText('SEX = "drop"');
  await expect(readout).toContainText('equivalence classes: 4, k = 4, l = 1');
  await expect(readout).toContainText('-> diagnosis revealed');
  await expect(viz.locator('[data-kanon-groups]')).toHaveAttribute('data-k', '4');
  await expect(viz.locator('[data-kanon-groups]')).toHaveAttribute('data-l', '1');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="kanon-python"] [class*="kw"]');
});
