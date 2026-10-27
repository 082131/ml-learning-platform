import { expect, test } from '@playwright/test';
import { giniExercise } from '../../content/tracks/ml/classical/trees-ensembles/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/trees-ensembles';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Decision trees');
});

test('trying the next threshold changes the plot, the arithmetic and the readout together', async ({
  page,
}) => {
  const viz = page.locator('[data-split-threshold]');
  await expect(viz).toHaveAttribute('data-split-threshold', '38.85');
  const slider = page.getByRole('slider', { name: 'Candidate threshold' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  // bill ≤ 40.05: 5 Adelie left; 1 Adelie, 4 Chinstrap, 4 Gentoo right: 9/14 · 48/81 = 0.381
  await expect(viz).toHaveAttribute('data-split-threshold', '40.05');
  const arithmetic = page.locator('[data-split-arithmetic]');
  await expect(arithmetic).toContainText('9 penguins (1 Adelie, 4 Chinstrap, 4 Gentoo)');
  await expect(arithmetic).toContainText('1 − ((1/9)² + (4/9)² + (4/9)²) = 0.5926');
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('bill_length_mm ≤ 40.05: weighted Gini 5/14·0 + 9/14·0.5926 = 0.381');
});

test('switching the feature refills the code, the printed result and the trace', async ({ page }) => {
  await page.getByLabel('Feature to split on').selectOption('flipper_length_mm');
  const code = page.locator('[data-code-example="tree-split-search"]').first();
  await expect(code).toContainText(
    'xs = [182, 185, 195, 186, 190, 191, 215, 209, 203, 216, 187, 205, 199, 202]',
  );
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('197.0 0.3673');
  const step = page.locator('[data-step-through="tree-split-search"]');
  await expect(step.locator('[data-active-line]')).toContainText('xs = [182, 185');
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 4; i++) await next.click();
  await expect(step).toContainText('Candidate t = 183.5');
  await next.click();
  await expect(step).toContainText('x ≤ 183.5 sends 1 penguin left');
});

test('the depth slider grows the drawn tree and changes max_depth and export_text', async ({ page }) => {
  const depth = page.getByRole('slider', { name: 'Tree depth (max_depth)' });
  await depth.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-code-example="tree-sklearn"]')).toContainText(
    'max_depth=3, random_state=0',
  );
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('|   |   |--- bill_length_mm <= 50.60');
  await expect(readout).toContainText('14/14 training penguins right');
  const tree = page.locator('[data-viz="Tree grown with max_depth=3"]');
  await expect(tree.locator('[data-node="RR"]')).toContainText('bill_length_mm ≤ 50.6');
  await expect(tree).toContainText('4 leaves');
});

test('the forest vote and the boosting stages follow their sliders', async ({ page }) => {
  const forest = page.locator('[data-experiment="tree-forest"]');
  await expect(forest.locator('[data-votes]')).toHaveAttribute('data-votes', '0,10,15');
  const trees = forest.getByRole('slider', { name: 'Number of trees' });
  await trees.focus();
  await page.keyboard.press('Home');
  await expect(forest.locator('[data-votes]')).toContainText('1 of 1');
  await expect(forest.getByRole('region', { name: 'Result' })).toContainText(
    'Single tree accuracy on held-out rows',
  );
  await expect(forest.getByRole('region', { name: 'Result' })).toContainText('96/103 = 93.2 %');

  const boost = page.locator('[data-experiment="tree-boost"]');
  await boost.getByLabel('Learning rate').selectOption('1.0');
  const stages = boost.getByRole('slider', { name: 'Stages (n_estimators)' });
  await stages.focus();
  await page.keyboard.press('Home');
  await expect(boost.locator('[data-code-example="tree-boost-sklearn"]')).toContainText(
    'n_estimators=1, learning_rate=1.0, max_depth=1',
  );
  // scikit-learn 1.8 printed 76402.8 for this model
  await expect(boost.getByRole('region', { name: 'Result' })).toContainText('76402.8');
  await expect(boost.locator('[data-boost-arithmetic]')).toContainText('flipper ≤ 202.5');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the split search runs in the browser and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'split_search.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('41.95 0.2857', {
      timeout: 90_000,
    });
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('an empty node has impurity 0', {
      timeout: 60_000,
    });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(giniExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
