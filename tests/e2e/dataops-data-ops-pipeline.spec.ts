import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(
    page,
    context,
    'capstone/data-ops-pipeline',
    'Capstone: a data operations pipeline',
  );
});

test('the brief lists nine milestones and the reference run shows each gate', async ({ page }) => {
  await expect(page.locator('#section-practice').getByRole('checkbox')).toHaveCount(9);
  const runner = page.locator('#section-code [data-python-runner]');
  await expect(runner).toContainText('def run(batch, baseline_amounts, erased):');
  await expect(page.locator('#section-code')).toContainText('ben passes them by luck');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-python-runner]');
});
