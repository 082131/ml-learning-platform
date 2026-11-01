import { expect, test } from '@playwright/test';
import { regressionExercise } from '../../content/tracks/ai/capstone/ai-app/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { passExercise } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/capstone/ai-app', 'Capstone: an AI application');
});

test('shows the harness and the brief, and a ticked milestone survives a reload', async ({ page }) => {
  await expect(page.locator('[data-code-example="capstone-ai-harness"]')).toContainText(
    'MODEL = "claude-opus-5-5"',
  );
  await expect(page.getByText(/Milestones · 0 of 9 done/)).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await expect(page.getByText(/Milestones · 1 of 9 done/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the exercise passes with the solution', async ({ page }) => {
    await passExercise(page, regressionExercise.solution);
  });
});
