import { expect, test } from '@playwright/test';
import { sseExercise } from '../../content/tracks/ai/apps/ai-apis/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/apps/ai-apis', 'Building AI APIs');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('the waiting client times out on a long reply, and both succeed on a short one', async ({ page }) => {
  const viz = page.locator('[data-viz="When the user first sees text"]');
  await expect(viz.locator('[data-mode="waiting"]')).toHaveAttribute('data-ok', 'false');
  await expect(viz.locator('[data-mode="streaming"]')).toHaveAttribute('data-ok', 'true');
  await nudge(page, exp(page, 'stream').getByRole('slider', { name: 'Reply length (tokens)' }), -8);
  await expect(viz.locator('[data-mode="waiting"]')).toHaveAttribute('data-ok', 'true');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the SSE parser prints the events, and the exercise passes', async ({ page }) => {
    await runPython(page, 'parse_sse.py', "text_delta {'text': ' means your quota is full.'}");
    await passExercise(page, sseExercise.solution);
  });
});
