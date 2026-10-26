import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) =>
  openMathLesson(page, 'loss-optimization', 'Loss functions and optimization'),
);

test('the 1-D descent lands on the minimum in one step with a learning rate of 0.5', async ({ page }) => {
  const lr = page.getByRole('slider', { name: 'Learning rate η' }).first();
  await lr.fill('0.5');
  await expect(page.locator('[data-gd-step="0"]')).toContainText('= 6 − 0.5 × 8 = 2');
});

test('the contour map, linked code and printout follow the sliders', async ({ page }) => {
  const map = page.locator('[data-viz="Loss surface from above"]');
  const code = page.locator('[data-code-example="descent-2d-code"]');
  await expect(map.locator('[data-level]')).toHaveCount(7);
  await expect(code).toContainText('w, b = -1.0, 5.0');
  await expect(code).toContainText('lr = 0.1');
  // CPython 3.13 output of the code for these settings (src/lib/optimization/fixtures/descent-prints.json)
  await expect(page.getByText('1.4638 1.5179 0.3869').first()).toBeVisible();

  const lr = page.getByRole('slider', { name: 'Learning rate η' }).nth(1);
  await lr.fill('0.24');
  const steps = page.getByRole('slider', { name: 'Steps' }).nth(1);
  await steps.fill('100');
  await expect(code).toContainText('lr = 0.24');
  await expect(code).toContainText('for step in range(100):');
  await expect(page.locator('[data-descent-status="up"]')).toBeVisible();
  await expect(page.getByText('-1.9699 -0.9657 73.0305').first()).toBeVisible();
  await expect(page.getByText(/Loss went up, from 10 to/).first()).toBeVisible();
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
