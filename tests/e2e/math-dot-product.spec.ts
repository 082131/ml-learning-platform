import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'dot-product', 'Dot product'));

test('moving v updates the plane, the code literal, the dot product and the angle together', async ({
  page,
}) => {
  const plane = page.locator('[data-viz="u and v"]');
  const handle = plane.getByRole('slider', { name: 'Vector v' });
  await handle.focus();
  // v from (1, 2) to (-1, 3): perpendicular to u = (3, 1).
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp'])
    await page.keyboard.press(key);
  await expect(handle).toHaveAttribute('aria-valuetext', '(-1, 3)');
  await expect(page.locator('[data-code-example="dot-numpy"]')).toContainText('v = np.array([-1, 3])');
  const result = page.getByRole('region', { name: 'Result' });
  await expect(result).toContainText('0 = 3·(-1) + 1·3');
  await expect(result).toContainText('90°');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('0.0');
});

test('a zero vector is reported as undefined, not plotted as an angle', async ({ page }) => {
  const handle = page.locator('[data-viz="u and v"]').getByRole('slider', { name: 'Vector u' });
  await handle.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(handle).toHaveAttribute('aria-valuetext', '(0, 0)');
  await expect(page.getByRole('region', { name: 'Result' })).toContainText('undefined');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
