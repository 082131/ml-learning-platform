import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { bpeRunner } from '../../content/tracks/ml/deep/tokenization/code';
import { countPairsExercise } from '../../content/tracks/ml/deep/tokenization/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ml/deep/tokenization';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tokenization');
});

const playground = (page: Page) =>
  page.locator('[data-experiment="bpe"]').filter({ has: page.getByRole('slider') });

async function setMerges(page: Page, n: number) {
  const slider = playground(page).getByRole('slider', { name: 'Number of merges' });
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < n; i++) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue(String(n));
}

test('changing the number of merges changes the merges, tokens, code literal, printout and trace together', async ({
  page,
}) => {
  await setMerges(page, 2);
  const merges = page.locator('[data-viz="BPE merges"]');
  await expect(merges).toContainText('2 merges learned');
  await expect(merges.getByRole('button', { name: '2. es + t → est' })).toBeVisible();
  await expect(merges.getByRole('button', { name: /^3\. / })).toHaveCount(0);

  // With only e+s and es+t, "lowest" is l | o | w | est.
  const tokens = page.locator('[data-viz="Vocabulary and tokens"] [data-tokens]');
  await expect(tokens.getByRole('listitem').first()).toHaveAccessibleName('l, ID 4');
  await expect(tokens.getByRole('listitem', { name: 'est, ID 12' })).toBeVisible();

  const code = page.locator('[data-code-example="bpe-train"]');
  await expect(code).toContainText('num_merges = 2');
  const printout = page.getByRole('region', { name: 'What the program prints' });
  await expect(printout).toContainText('merge 2: es + t (count 9)');
  await expect(printout).not.toContainText('merge 3:');
  await expect(printout).toContainText('13 tokens in the vocabulary');

  const step = page.locator('[data-step-through="bpe-train"]');
  await expect(step.getByText('Step 1 of 14')).toBeVisible();
  const next = step.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 7; i++) await next.click();
  await expect(step).toContainText('The most frequent pair is (e, s) with count 9.');
});

test('an unseen character falls back to [UNK] in the visual, the code and the printout', async ({ page }) => {
  await playground(page).getByRole('textbox', { name: 'Text to tokenize' }).fill('zest');
  const tokens = page.locator('[data-viz="Vocabulary and tokens"] [data-tokens]');
  await expect(tokens.getByRole('listitem', { name: '[UNK], ID 0, replaces z' })).toBeVisible();
  await expect(tokens.getByRole('listitem', { name: 'est, ID 12' })).toBeVisible();
  await expect(page.locator('[data-code-example="bpe-train"]')).toContainText('text = "zest"');
  const printout = page.getByRole('region', { name: 'What the program prints' });
  await expect(printout).toContainText('[0, 12]');
  await expect(printout).toContainText('[UNK] | est');
});

test('selecting a merge shows the pair counts that chose it and the rewritten words', async ({ page }) => {
  const merges = page.locator('[data-viz="BPE merges"]');
  await merges.getByRole('button', { name: '7. new + est → newest' }).click();
  await expect(merges.getByRole('button', { name: '7. new + est → newest' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const detail = merges.locator('[data-merge="7"]');
  await expect(detail.getByRole('row', { name: /new \+ est 6 ✓ chosen/ })).toBeVisible();
  await expect(
    detail.getByRole('listitem', { name: /newest, 6 times: new est becomes newest/ }),
  ).toBeVisible();
  await merges.getByRole('button', { name: 'Next merge' }).click();
  await expect(merges.locator('[data-merge="8"]')).toContainText('w + i');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="bpe-train"] [class*="kw"]').first().waitFor();
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

  test('the runner prints what the playground computed, and the exercise passes with the solution', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'bpe_run.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText(
      bpeRunner.expectedOutput!,
      {
        timeout: 90_000,
      },
    );

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('one word, count 1', { timeout: 60_000 });
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(countPairsExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
