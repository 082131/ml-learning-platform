import { expect, test } from '@playwright/test';
import { backoffExercise } from '../../content/tracks/ai/usage/pretrained-apis/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/usage/pretrained-apis', 'Using pretrained models');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('a bad request is not retried, and an outage gives up after the max retries', async ({ page }) => {
  const run = page.getByRole('region', { name: 'This run', exact: true });
  const behavior = exp(page, 'retry').getByRole('combobox', { name: 'Server behavior' });
  await behavior.selectOption({ label: 'Bad request (400)' });
  await expect(page.locator('[data-viz="Requests and waits over time"] [data-attempt]')).toHaveCount(1);
  await behavior.selectOption({ label: 'Outage (503 every time)' });
  await expect(run).toContainText('Requests sent');
  await expect(page.locator('[data-code-example="retry-loop"]')).toBeVisible();
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the retry simulation prints its attempts, and the exercise passes', async ({ page }) => {
    await runPython(page, 'retry_sim.py', 't= 5.8s attempt 2: 200');
    await passExercise(page, backoffExercise.solution);
  });
});
