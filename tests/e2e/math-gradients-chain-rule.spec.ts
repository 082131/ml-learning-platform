import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'gradients-chain-rule', 'Partial derivatives'));

test('changing an input updates the graph, the code, the trace and the printed gradient together', async ({
  page,
}) => {
  const graph = page.locator('[data-viz="Computation graph"]');
  await expect(page.locator('[data-gradient-of="w"]')).toContainText('= (-8) · 1 · 1 · 2 = -16');

  const x = page.getByRole('slider', { name: 'Feature x' });
  await x.focus();
  await page.keyboard.press('ArrowRight'); // x = 2.5: e = -3.5, dL/dw = -7 · 2.5 = -17.5
  await expect(graph.locator('[data-node="e"]')).toContainText('-3.5');
  await expect(page.locator('[data-gradient-of="w"]')).toContainText('= (-7) · 1 · 1 · 2.5 = -17.5');
  const trace = page.locator('[data-step-through="chain-rule-code"]');
  await expect(trace.locator('[data-active-line]')).toContainText('w, x, b, y = 1, 2.5, 0, 6');
  // CPython: print(L, dL_dw, dL_db) with x a float
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('12.25 -17.5 -7.0');

  await graph.locator('[data-node="b"]').click();
  await expect(page.locator('[data-gradient-of="b"]')).toContainText('∂L/∂b = ∂L/∂e · ∂e/∂ŷ · ∂ŷ/∂b');
});

test('the step-through walks forward then backward with the computed arithmetic', async ({ page }) => {
  const trace = page.locator('[data-step-through="chain-rule-code"]');
  const next = trace.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 9; i++) await next.click();
  await expect(trace.getByText('Step 10 of 11')).toBeVisible();
  await expect(trace).toContainText('∂L/∂w = ∂L/∂p · x = (-8)·2 = -16.');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
