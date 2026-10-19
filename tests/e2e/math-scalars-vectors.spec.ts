import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'scalars-vectors', 'Scalars, vectors'));

test('moving u changes the plane, the code literal and the printed output together', async ({ page }) => {
  const plane = page.locator('[data-viz="Vectors on a plane"]');
  const handle = plane.getByRole('slider', { name: 'Vector u' });
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuetext', '(3.5, 1)');
  await expect(plane).toContainText('u + v = (4.5, 3)');

  const code = page.locator('[data-code-example="vectors-numpy"]');
  await expect(code).toContainText('u = np.array([3.5, 1])');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  // NumPy 2.5.3 prints these for u = [3.5, 1], v = [1, 2], k = 1.5.
  await expect(printed).toContainText('[4.5 3. ]');
  await expect(printed).toContainText('[5.25 1.5 ]');
});

test('the scalar slider rescales k·u and switches the dtype NumPy prints', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Scalar k' });
  await slider.focus();
  await page.keyboard.press('ArrowRight'); // k = 2, a Python int
  await expect(page.locator('[data-code-example="vectors-numpy"]')).toContainText('k = 2');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('[6 2]');
  await expect(page.locator('[data-viz="Vectors on a plane"]')).toContainText('2·u = (6, 2)');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
