import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { promptExercise } from '../../content/tracks/ai/rag/rag-pipeline/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ai/rag/rag-pipeline';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Retrieval-augmented generation');
});

const controls = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="rag"]').filter({ has: page.getByRole('combobox', { name: 'Question' }) });

test('turning reranking off and k down drops the answer chunk from the prompt, the table and the response', async ({
  page,
}) => {
  const exp = controls(page);
  const response = page.getByRole('region', { name: 'Model response' });
  await expect(response).toHaveAttribute('data-response', 'grounded');
  await expect(response).toContainText('Error E-402 means your storage quota is full [1].');

  const weight = exp.getByRole('slider', { name: 'Keyword weight in reranking' });
  await weight.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  const k = exp.getByRole('slider', { name: 'Chunks in the prompt (k)' });
  await k.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');

  await expect(response).toHaveAttribute('data-response', 'missing');
  await expect(page.locator('[data-prompt]')).toContainText('[1] (Payment errors)');
  await expect(page.locator('[data-prompt]')).not.toContainText('[2] (');
  await expect(page.locator('[data-chunk="payments#0"]')).toContainText('in prompt as [1]');
  await expect(page.locator('[data-code-example="rag-retrieve"]')).toContainText(
    'SIZE, OVERLAP, K, KEYWORD_WEIGHT = 40, 10, 1, 0.0',
  );
  await expect(page.getByRole('region', { name: 'This run' })).toContainText(
    'cosine rank 2, not in the prompt',
  );
});

test('changing the chunk size re-chunks the documents everywhere', async ({ page }) => {
  await controls(page).getByRole('combobox', { name: 'Chunk size' }).selectOption('80');
  await expect(page.getByRole('region', { name: 'This run' })).toContainText('(80 words, 10 overlap)');
  await expect(page.locator('[data-viz^="Retrieved and reranked"]')).toContainText('of 14 chunks');
  await expect(page.locator('[data-code-example="rag-retrieve"]')).toContainText('= 80, 10, 3, 0.5');
});

test('a question the documents do not answer gets the "not in the context" response', async ({ page }) => {
  await controls(page).getByRole('combobox', { name: 'Question' }).selectOption('handwriting');
  await expect(page.getByRole('region', { name: 'Model response' })).toContainText(
    "doesn't mention handwriting recognition",
  );
  await expect(page.getByRole('region', { name: 'This run' })).toContainText('no chunk contains it');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="rag-retrieve"] [class*="kw"]').first().waitFor();
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

  test('the chunking runner prints both chunkings and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'chunking.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      'Monthly plans are not refunded.',
      {
        timeout: 90_000,
      },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(promptExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
