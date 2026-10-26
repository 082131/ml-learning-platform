import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'matrices', 'Matrices'));

test('editing A changes Aᵀ, the sum, the code literal and the printout together', async ({ page }) => {
  const transpose = page.locator('[data-viz="A and its transpose"]');
  await transpose.getByRole('textbox', { name: 'A[0][2]' }).fill('9');
  await expect(transpose.getByRole('button', { name: 'Aᵀ[2][0] = 9' })).toBeVisible();
  await expect(page.locator('[data-viz="A + B"]').getByRole('button', { name: 'S[0][2] = 8' })).toBeVisible();
  await expect(page.locator('[data-code-example="matrices-numpy"]')).toContainText(
    'A = np.array([[1, 2, 9], [4, 5, 6]])',
  );
  const printed = page.getByRole('region', { name: 'What the code prints' });
  // NumPy 2.5.3: print(A.T) for A = [[1, 2, 9], [4, 5, 6]]
  await expect(printed).toContainText('[[1 4]\n [2 5]\n [9 6]]');
});

test('selecting an entry of Aᵀ moves the index in the code and the readout', async ({ page }) => {
  await page
    .locator('[data-viz="A and its transpose"]')
    .getByRole('button', { name: 'Aᵀ[2][1] = 6' })
    .click();
  await expect(page.locator('[data-code-example="matrices-numpy"]')).toContainText('print(A[1, 2])');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('print(A[1, 2])');
  await expect(printed).toContainText('[4 5 6]');
  await expect(page.locator('[data-sum-entry="1,2"]')).toContainText('6 + 4 = 10');
});

test('the shape sliders reshape A, Aᵀ and the printed shapes', async ({ page }) => {
  const rows = page.getByRole('slider', { name: 'Rows' });
  await rows.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-matrix="Aᵀ"] caption')).toContainText('shape (3, 3)');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('(3, 3)');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
