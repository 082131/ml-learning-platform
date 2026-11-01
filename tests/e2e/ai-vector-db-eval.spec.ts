import { expect, test } from '@playwright/test';
import { recallExercise } from '../../content/tracks/ai/rag/vector-db-eval/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/rag/vector-db-eval', 'Vector databases');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('searching more clusters raises recall', async ({ page }) => {
  const setting = page.getByRole('region', { name: 'This setting', exact: true });
  await expect(setting).toContainText('0.957');
  await nudge(
    page,
    exp(page, 'ivf').getByRole('slider', { name: 'Clusters searched per query (nprobe)' }),
    -3,
  );
  await expect(setting).toContainText('(3.4%)');
});

test('keyword weight in reranking brings recall@1 to 1.00', async ({ page }) => {
  const metrics = page.getByRole('region', { name: 'Metrics', exact: true });
  await expect(metrics).toContainText('0.83');
  await nudge(page, page.getByRole('slider', { name: 'Keyword weight in reranking' }).first(), 5);
  await expect(metrics).toContainText('1.00');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the metrics runner prints recall and MRR, and the exercise passes', async ({ page }) => {
    await runPython(page, 'retrieval_metrics.py', 'MRR = 0.83');
    await passExercise(page, recallExercise.solution);
  });
});
