import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ai/representations/tokens-embeddings';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tokenization, embeddings');
});

test('typing text changes the token chips, the code literal and the printed output together', async ({
  page,
}) => {
  const playground = page.locator('[data-experiment="tokenizer"]').filter({ has: page.getByRole('textbox') });
  await playground.getByRole('textbox', { name: 'Text to tokenize' }).fill('Café E-402');
  const viz = page.locator('[data-viz="Tokens and token IDs"]');
  // tokens: [CLS] cafe e - 402 [SEP]
  await expect(viz.getByRole('button', { name: /^Token \d+:/ })).toHaveCount(6);
  await expect(viz.getByRole('button', { name: /Token 1: cafe\W+ID 7668/ })).toBeVisible();
  await expect(page.locator('[data-code-example="tokenize-hf"]')).toContainText(
    "enc = tok.encode('Café E-402')",
  );
  const printed = page.getByRole('region', { name: 'What the code prints' });
  await expect(printed).toContainText("['[CLS]', 'cafe', 'e', '-', '402', '[SEP]']");
  await expect(printed).toContainText('[101, 7668,');
});

test('selecting a token shows how WordPiece split its word', async ({ page }) => {
  const viz = page.locator('[data-viz="Tokens and token IDs"]');
  await viz.getByRole('button', { name: /Token 1: token\W+ID 19204/ }).click();
  const detail = viz.locator('[data-token-detail]');
  await expect(detail).toContainText('from the word tokenizers');
  await expect(detail).toContainText('##izer ✓ in vocabulary');
});

test('choosing a query re-ranks the sentences, moves the map and changes the code', async ({ page }) => {
  const exp = page.locator('[data-experiment="similarity"]').filter({ has: page.getByRole('combobox') });
  const ranking = page.locator('[data-viz="Nearest sentences by cosine similarity"]');
  await expect(ranking.locator('[data-rank="1"]')).toContainText('A cat was sitting on the mat.');
  await expect(ranking.locator('[data-rank="1"]')).toContainText('0.627');
  await exp.getByRole('combobox', { name: 'Query' }).selectOption('q-bad-movie');
  await expect(ranking.locator('[data-rank="1"]')).toContainText('The movie was not good.');
  await expect(page.locator('[data-code-example="similarity-st"]')).toContainText(
    "model.encode('a terrible film'",
  );
  await expect(page.getByRole('region', { name: /Top 3 for this query/ })).toContainText(
    'The movie was not good.',
  );
  // Selecting a sentence makes it the query: it ranks first against itself with cosine 1.000.
  await ranking.getByRole('button', { name: /I deposited my paycheck/ }).click();
  await expect(ranking.locator('[data-rank="1"]')).toContainText('1.000');
  await expect(ranking.locator('[data-rank="2"]')).toContainText('We had a picnic on the bank of the river.');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="tokenize-hf"] [class*="kw"]').first().waitFor();
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

  test('the cosine runner prints the expected similarities', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'cosine.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('0.963\n0.024\n1.0', {
      timeout: 90_000,
    });
  });
});
