import { expect, test } from '@playwright/test';
import { softmaxExercise } from '../../content/tracks/ai/llm/transformers-llms/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/llm/transformers-llms', 'Transformers, attention');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('the default sample is reproducible, and temperature 0 always picks the most likely word', async ({
  page,
}) => {
  const text = page.locator('[data-generated]');
  await expect(text).toHaveAttribute('data-generated', /^error e-402 means your storage quota is/);
  const t = exp(page, 'next-token').getByRole('slider', { name: 'Temperature' });
  await nudge(page, t, -20);
  const sample = page.getByRole('region', { name: 'This sample', exact: true });
  const first = await text.getAttribute('data-generated');
  await exp(page, 'next-token').getByRole('spinbutton', { name: 'Random seed' }).fill('7');
  await expect(text).toHaveAttribute('data-generated', first!);
  await expect(sample).toContainText('Generated');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the sampling runner prints the softmax at three temperatures, and the exercise passes', async ({
    page,
  }) => {
    await runPython(page, 'sampling.py', 'T=0.5: [0.6, 0.267, 0.067, 0.067]');
    await passExercise(page, softmaxExercise.solution);
  });
});
