import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { evaluateExercise } from '../../content/tracks/ml/classical/project-classification/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/classical/project-classification';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('end-to-end classification');
});

test('shows the workflow, the reference output labeled as not run here, and the brief', async ({ page }) => {
  await expect(page.locator('[data-viz="Classification workflow"]')).toContainText('Stratified split');
  const code = page.locator('[data-code-example="project-compare"]');
  await expect(code).toContainText('StratifiedKFold(n_splits=5, shuffle=True, random_state=0)');
  await expect(page.getByText('logistic  0.914 ± 0.035')).toBeVisible();
  const runner = page.locator('[data-python-runner]').filter({ hasText: 'evaluate.py' });
  await expect(runner.getByRole('group', { name: 'Expected output' })).toContainText('[[28, 5], [1, 33]]');
  await expect(page.getByText(/Milestones · 0 of 8 done/)).toBeVisible();
});

test('ticking a milestone is saved across a reload', async ({ page }) => {
  const box = page.getByRole('checkbox').first();
  await box.check();
  await expect(page.getByText(/Milestones · 1 of 8 done/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="project-compare"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the evaluation runner reproduces the confusion matrix, and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'evaluate.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const out = runner.getByRole('group', { name: 'Printed output' });
    await expect(out).toContainText('[[28, 5], [1, 33]]', { timeout: 90_000 });
    await expect(out).toContainText('recall   : 0.971');

    const exercise = page.locator('#section-exercise');
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(evaluateExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
