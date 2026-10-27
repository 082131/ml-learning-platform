import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { cosineExercise } from '../../content/tracks/ml/deep/embeddings/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/embeddings';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Embeddings');
});

test('moving kitten with the keyboard changes the map, the code literal, the trace and the printout', async ({
  page,
}) => {
  const map = page.locator('[data-viz="Embedding map"]');
  const kitten = map.getByRole('button', { name: /^kitten \(b\), ID 1, at \(2, 1\)/ });
  await kitten.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(map.getByRole('button', { name: /^kitten \(b\), ID 1, at \(1\.5, 1\)/ })).toBeVisible();

  // cos(cat, kitten) = (3·1.5 + 1·1) / (√10 · √3.25) = 5.5 / (3.1623 × 1.8028) ≈ 0.9648
  const math = map.locator('[data-cos="0,1"]');
  await expect(math).toContainText('a · b = 3·1.5 + 1·1 = 5.5');
  await expect(math).toContainText('cos = 5.5 / (3.1623 × 1.8028) = 0.9648');

  const code = page.locator('[data-code-example="emb-code"]');
  await expect(code).toContainText('E = np.array([[3, 1], [1.5, 1], [2.5, 2]');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('[3. 1.]');
  await expect(printout).toContainText('0.9648');

  const step = page.locator('[data-step-through="emb-code"]');
  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('Printed with 4 decimals: 0.9648.');
});

test('choosing the query token changes the lookup, the neighbours and the code', async ({ page }) => {
  const controls = page.locator('[data-experiment="emb"]').filter({ has: page.getByRole('combobox') });
  await controls.getByRole('combobox', { name: 'Query token (a)' }).selectOption('4');

  const lookup = page.locator('[data-viz="Embedding lookup"]');
  await expect(
    lookup.locator('[data-matrix="one_hot"]').getByRole('columnheader', { name: 'column 4 (highlighted)' }),
  ).toBeVisible();
  await expect(
    lookup.locator('[data-matrix="E"]').getByRole('rowheader', { name: 'row 4 (highlighted)' }),
  ).toBeVisible();
  await expect(lookup).toContainText('gives row 4 of E: (-1, 3.5)');

  const map = page.locator('[data-viz="Embedding map"]');
  await expect(map.getByRole('button', { name: /^car \(a\), ID 4/ })).toHaveAttribute('aria-pressed', 'true');
  // car (−1, 3.5): truck (−2, 4) is closest: (2 + 14) / (√13.25 · √20) ≈ 0.9829
  await expect(map.locator('[data-neighbours] li').first()).toHaveText('truck: 0.9829');
  await expect(page.locator('[data-code-example="emb-code"]')).toContainText('a_id, b_id = 4, 1');
  await expect(page.getByRole('region', { name: 'What the code prints' })).toContainText('[-1.   3.5]');
});

test('selecting a point makes it the query', async ({ page }) => {
  const map = page.locator('[data-viz="Embedding map"]');
  await map.getByRole('button', { name: /^apple, ID 6/ }).focus();
  await page.keyboard.press('Enter');
  await expect(map.getByRole('button', { name: /^apple \(a\), ID 6/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(map.locator('[data-neighbours] li').first()).toHaveText('banana: 0.9588');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="emb-code"] [class*="kw"]').first().waitFor();
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

  test('the cosine exercise fails on the starter and passes with the solution', async ({ page }) => {
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('cat and kitten', { timeout: 90_000 });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(cosineExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
