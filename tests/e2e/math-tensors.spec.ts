import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'tensors', 'Tensors and shapes'));

test('choosing an operation changes y, the code and the printout; selecting an entry follows it', async ({
  page,
}) => {
  const viz = page.locator('[data-viz="Tensor shapes"]');
  await expect(viz.locator('[data-tensor-entry="1,1,0"]')).toContainText('x[1, 1, 0] = 9 lands at y[1, 3]');

  await page.getByRole('combobox', { name: 'Operation' }).selectOption('transpose');
  await expect(page.locator('[data-code-example="tensors-numpy"]')).toContainText('y = x.transpose(0, 2, 1)');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('(2, 2, 3) -> (2, 3, 2)');
  // NumPy 2.5.3: np.arange(12).reshape(2, 2, 3).transpose(0, 2, 1)
  await expect(printed).toContainText(
    '[[[ 0  3]\n  [ 1  4]\n  [ 2  5]]\n\n [[ 6  9]\n  [ 7 10]\n  [ 8 11]]]',
  );

  await viz.getByRole('button', { name: 'x[0][0][2] = 2' }).click();
  await expect(viz.locator('[data-tensor-entry="0,0,2"]')).toContainText('lands at y[0, 2, 0]');
});

test('changing the batch size reshapes x, y and the code', async ({ page }) => {
  const batch = page.getByRole('slider', { name: 'Batch size b (axis 0)' });
  await batch.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-code-example="tensors-numpy"]')).toContainText(
    'x = np.arange(18).reshape(3, 2, 3)',
  );
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText(
    '(3, 2, 3) -> (3, 6)',
  );
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
