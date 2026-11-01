import { expect, test } from '@playwright/test';
import { chooseExercise } from '../../content/tracks/ai/fundamentals/ai-landscape/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/fundamentals/ai-landscape', 'when to train, fine-tune');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('the default volume favors the API, and keeping data in house changes the API row', async ({ page }) => {
  const table = page.locator('[data-viz="Four ways to get a model"]');
  await expect(page.getByRole('region', { name: 'This choice', exact: true })).toContainText('12,000');
  await exp(page, 'approach')
    .getByRole('combobox', { name: 'Can the data go to an outside provider?' })
    .selectOption('stay-in-house');
  await expect(table.locator('[data-approach="api"]')).toContainText('poor fit');
});

test('the cancellation task suggests training your own model', async ({ page }) => {
  await exp(page, 'approach').getByRole('combobox', { name: 'Task' }).selectOption('tabular');
  await expect(page.locator('[data-viz="Four ways to get a model"] [data-approach="train"]')).toContainText(
    '(suggested)',
  );
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the break-even runner prints the volume, and the exercise passes with the solution', async ({
    page,
  }) => {
    await runPython(page, 'break_even.py', 'Break-even: 12,000 requests per day');
    await passExercise(page, chooseExercise.solution);
  });
});
