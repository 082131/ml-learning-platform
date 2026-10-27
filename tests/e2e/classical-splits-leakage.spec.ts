import { expect, test } from '@playwright/test';
import { splitExercise } from '../../content/tracks/ml/classical/splits-leakage/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/splits-leakage';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Train, validation and test sets');
});

const controls = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="splits-leakage"]').filter({ has: page.getByRole('slider') });

test('the starting split and scores agree across the bar, the code and the readout', async ({ page }) => {
  const exp = controls(page);
  const bar = exp.locator('[data-split-bar]');
  await expect(bar.locator('[data-split="train"]')).toHaveCount(33);
  await expect(bar.locator('[data-split="validation"]')).toHaveCount(9);
  await expect(bar.locator('[data-split="test"]')).toHaveCount(18);
  await expect(bar.locator('[data-seen]')).toHaveCount(33);
  const code = page.locator('[data-code-example="splits-sklearn"]');
  await expect(code).toContainText('test_size=18, random_state=1');
  await expect(code).toContainText('test_size=9, random_state=1');
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('33 9 18');
  const result = exp.getByRole('region', { name: 'Result' });
  await expect(result).toContainText('9 / 18 = 50.0%');
  await expect(result).toContainText('16 / 18 = 88.9%');
  await expect(result).toContainText('+38.9 percentage points');
  await expect(exp.locator('[data-score="honest"]')).toContainText('9 / 18 = 50.0%');
  await expect(exp.locator('[data-score="leaked"]')).toContainText('16 / 18 = 88.9%');
});

test('changing the seed and the test share updates every view together', async ({ page }) => {
  const exp = controls(page);
  await exp.getByRole('slider', { name: 'Shuffle seed' }).focus();
  await page.keyboard.press('ArrowRight');
  // Seed 2: 10 of 18 right without the leak, 14 of 18 with it (computed by the lesson's lib, see splits.test.ts)
  await expect(exp.locator('[data-score="honest"]')).toContainText('10 / 18 = 55.6%');
  await expect(exp.locator('[data-score="leaked"]')).toContainText('14 / 18 = 77.8%');
  await expect(page.locator('[data-code-example="splits-sklearn"]')).toContainText('random_state=2');

  await exp.getByRole('slider', { name: 'Test share (%)' }).focus();
  await page.keyboard.press('ArrowRight');
  // 60 · 35 / 100 = 21 test rows, 9 validation, 60 − 9 − 21 = 30 train
  await expect(exp.locator('[data-split-bar] [data-split="test"]')).toHaveCount(21);
  await expect(exp.locator('[data-count="test"]')).toContainText('Test: 21 rows');
  await expect(page.locator('[data-code-example="splits-sklearn"]')).toContainText('test_size=21');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('30 9 21');
  await expect(page.locator('[data-viz="Rows by split"]').first().locator('[data-split="test"]')).toHaveCount(
    21,
  );
});

test('turning the leak on lets feature selection see every row', async ({ page }) => {
  const exp = controls(page);
  await exp.getByRole('combobox', { name: 'Feature selection sees' }).selectOption('on');
  await expect(exp.locator('[data-split-bar] [data-seen]')).toHaveCount(60);
  await expect(exp.getByRole('region', { name: 'Result' })).toContainText(
    'Test accuracy, current mode (leak)16 / 18 = 88.9%',
  );
  await expect(exp.locator('[data-score="leaked"]')).toContainText('current mode');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the split exercise passes with the solution', async ({ page }) => {
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(splitExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 90_000 });
  });
});
