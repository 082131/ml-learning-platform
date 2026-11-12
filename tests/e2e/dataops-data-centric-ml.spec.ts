import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'foundations/data-centric-ml', 'Data-centric ML');
});

test('fixing label noise beats a bigger model, in the grid, the code and the printout', async ({ page }) => {
  const { viz, code, readout } = experimentParts(page, 'data-centric', 'knn-python');
  await expect(readout).toContainText('labels flipped: 68 (34%)');
  await expect(readout).toContainText('test accuracy with k=1: 0.603');
  await expect(viz.locator('[data-current]')).toHaveAttribute('data-cell', '200,0.3');

  await viz.getByRole('combobox', { name: 'Wrong labels' }).selectOption('0.1');
  await viz.getByRole('combobox', { name: 'Model' }).selectOption('15');
  await expect(code).toContainText('NOISE = 0.1');
  await expect(code).toContainText('K = 15');
  await expect(viz.locator('[data-current]')).toHaveAttribute('data-cell', '200,0.1');
  await expect(readout).toContainText('labels flipped: 21 (10%)');
  await expect(readout).toContainText('test accuracy with k=15: 0.945');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="knn-python"] [class*="kw"]');
});
