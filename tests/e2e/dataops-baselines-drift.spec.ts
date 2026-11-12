import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'validation/baselines-drift', 'Data baselines');
});

test('a large window makes KS alert on a shift PSI calls stable, in the bars, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'drift', 'drift-python');
  await expect(readout).toContainText('KS D = 0.1110, p = 0.0303 -> drift alert');
  await expect(viz.locator('[data-psi]')).toHaveAttribute('data-psi', '0.114');

  await viz.getByRole('combobox', { name: 'Serving window' }).selectOption('20000');
  await expect(code).toContainText('WINDOW = 20000');
  await expect(readout).toContainText('KS D = 0.0514, p = 0.0125 -> drift alert');
  await expect(readout).toContainText('PSI = 0.019 -> stable');
  await expect(viz.locator('[data-psi]')).toHaveAttribute('data-psi', '0.019');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="drift-python"] [class*="kw"]');
});
