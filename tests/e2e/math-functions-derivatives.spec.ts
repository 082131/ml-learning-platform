import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openMathLesson } from './math-helpers';

test.beforeEach(async ({ page }) => openMathLesson(page, 'functions-derivatives', 'Functions and derivatives'));

test('changing h and x moves the secant, the code literals and the estimates together', async ({ page }) => {
  const viz = page.locator('[data-viz="Slope at a point"]');
  await expect(viz).toContainText('Secant over h = 0.1, slope 2.1');

  await page.getByRole('combobox', { name: 'Step h' }).selectOption('0.001');
  const code = page.locator('[data-code-example="derivative-code"]');
  await expect(code).toContainText('h = 0.001');
  await expect(viz).toContainText('Secant over h = 0.001, slope 2.001');
  // CPython: f"{forward:.6f} {central:.6f}" for x * x at x = 1, h = 0.001
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('2.001000 2.000000');

  const x = page.getByRole('slider', { name: 'Point x' });
  await x.focus();
  await page.keyboard.press('ArrowRight');
  await expect(code).toContainText('x = 1.1');
  await expect(viz).toContainText("f'(x) = 2.2");
});

test('|x| at 0 is reported as having no derivative', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Function' }).selectOption('abs');
  const x = page.getByRole('slider', { name: 'Point x' });
  await x.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-code-example="derivative-code"]')).toContainText('x = 0');
  await expect(page.getByRole('region', { name: 'Result' })).toContainText('undefined: the slope jumps');
  await expect(page.locator('[data-viz="Slope at a point"]')).toContainText('there is no tangent');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});
