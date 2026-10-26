import { expect, test } from '@playwright/test';
import { cleanExercise, sexGapExercise } from '../../content/tracks/ml/foundations/project-foundations/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/project-foundations', 'Project: analyze a small dataset end to end');
});

test('the brief shows milestones and rubric, and the checklist is saved', async ({ page }) => {
  const practice = page.locator('#section-practice');
  await expect(practice).toContainText('Claims match the evidence');
  const first = practice.getByRole('checkbox').first();
  await first.check();
  await page.reload();
  await expect(page.locator('#section-practice').getByRole('checkbox').first()).toBeChecked();
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('#section-practice').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 180_000 });
  test('the starter loads the data and both milestone exercises pass', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'analysis.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '2 rows dropped, leaving 342',
      { timeout: 150_000 },
    );
    for (const [i, ex] of [cleanExercise, sexGapExercise].entries()) {
      const box = page.locator('#section-exercise [data-exercise]').nth(i);
      await box.getByRole('textbox', { name: 'Your solution code editor' }).fill(ex.solution);
      await box.getByRole('button', { name: 'Run tests' }).click();
      await expect(box).toContainText('All tests passed.', { timeout: 60_000 });
    }
  });
});
