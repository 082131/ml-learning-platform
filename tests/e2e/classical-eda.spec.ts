import { expect, test } from '@playwright/test';
import { pearsonExercise } from '../../content/tracks/ml/classical/eda/quiz';
import { expectAccessibleInBothThemes } from './math-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto('./#/learn/ml/classical/eda');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Exploratory data analysis');
});

test('bill length vs depth shows Simpson’s paradox in the readout, the code and the trace', async ({
  page,
}) => {
  const scatter = page.locator('[data-eda-scatter]');
  await expect(scatter).toHaveAttribute('data-eda-scatter', 'bill_length_mm/bill_depth_mm');
  await expect(scatter).toContainText('Overall r = -0.235');
  // pandas 3.0.2 prints these lines (see src/lib/classical/eda.test.ts).
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('all 342 -0.235');
  await expect(printed).toContainText('Adelie 151 0.391');
  await expect(printed).toContainText('Gentoo 123 0.643');
  await expect(page.locator('[data-readout]').first()).toContainText("Simpson's paradox");
  await expect(page.locator('[data-code-example="eda-corr"]')).toContainText(
    'x, y = "bill_length_mm", "bill_depth_mm"',
  );

  const step = page.locator('[data-step-through="eda-pearson-loop"]');
  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('print(round(r, 3)) shows 0.876');
});

test('choosing other columns updates the scatter, the code, the readout and the hand computation', async ({
  page,
}) => {
  const controls = page.locator('[data-experiment="eda"]').filter({ has: page.getByRole('combobox') });
  await controls.getByRole('combobox', { name: 'x axis' }).selectOption('flipper_length_mm');
  await controls.getByRole('combobox', { name: 'y axis' }).selectOption('body_mass_g');
  await expect(page.locator('[data-eda-scatter]')).toHaveAttribute(
    'data-eda-scatter',
    'flipper_length_mm/body_mass_g',
  );
  await expect(page.locator('[data-code-example="eda-corr"]')).toContainText(
    'x, y = "flipper_length_mm", "body_mass_g"',
  );
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText('all 342 0.871');
  await expect(printed).toContainText('Chinstrap 68 0.642');
  const step = page.locator('[data-step-through="eda-pearson-loop"]');
  await expect(step).toContainText('ys = [3500, 3700, 3300, 3850, 3250, 3950]');
  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('print(round(r, 3)) shows 0.545');
});

test('the lesson is accessible in both themes without horizontal scroll', async ({ page }) => {
  await expectAccessibleInBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the pure-Python Pearson loop prints 0.876 and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'pearson.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('0.876', {
      timeout: 90_000,
    });

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(pearsonExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
