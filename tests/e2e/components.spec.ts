import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PYODIDE_INDEX_URL } from '../../src/lib/python/protocol';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 900;

/**
 * Python tests are tagged @network: they download Pyodide from jsDelivr. Skip them offline with
 * `npx playwright test --grep-invert @network`. To run them without network, extract the matching
 * `pyodide` npm package and set PYODIDE_DIR to its folder; requests to the CDN are then served from it.
 */
async function servePyodideLocally(context: BrowserContext) {
  const dir = process.env.PYODIDE_DIR;
  if (!dir) return;
  await context.route(`${PYODIDE_INDEX_URL}**`, async (route) => {
    const file = path.join(dir, new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const type = file.endsWith('.wasm')
      ? 'application/wasm'
      : file.endsWith('.json')
        ? 'application/json'
        : file.endsWith('js')
          ? 'text/javascript'
          : 'application/octet-stream';
    try {
      await route.fulfill({
        body: await readFile(file),
        contentType: type,
        headers: { 'access-control-allow-origin': '*' },
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
}

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto('./#/dev/components');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Code components');
});

test('annotated code explains on focus and pins with Enter, as a panel or a bottom sheet', async ({
  page,
}) => {
  const code = page.locator('[data-code-example="demo-matmul"]');
  await code.getByRole('button', { name: 'Line 1: import numpy as np' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(code.getByRole('button', { name: 'A', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(code.getByRole('button', { name: 'np.array' })).toBeFocused();
  await page.keyboard.press('Enter');

  if (isPhone(page)) {
    const sheet = page.getByRole('dialog', { name: 'np.array(...)' });
    await expect(sheet).toContainText('Builds an n-dimensional array');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  } else {
    const panel = code.locator('[data-annotation-panel="np-array"]');
    await expect(panel).toContainText('Pinned');
    await expect(panel).toContainText('Framework API');
    await code.getByRole('button', { name: '@' }).click();
    await expect(code.locator('[data-annotation-panel="matmul"]')).toContainText(
      'C[0, 0] = 1·7 + 2·9 + 3·11 = 58',
    );
    await page.keyboard.press('Escape');
    await expect(code.getByText('Pinned')).toBeHidden();
  }
  await expect(code.getByRole('button', { name: 'np.array' })).toHaveAttribute('aria-pressed', 'false');
});

test('the step-through follows the shared state: code literal, steps and values change together', async ({
  page,
}) => {
  const step = page.locator('[data-step-through="demo-running-sum"]');
  await expect(step).toContainText('Computed in your browser');
  await expect(step.locator('[data-active-line]')).toContainText('xs = [3, 1, 4]');

  const slider = page.getByRole('slider', { name: 'First item of xs' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(step.locator('[data-active-line]')).toContainText('xs = [5, 1, 4]');

  await step.getByRole('button', { name: 'Last step' }).click();
  await expect(step).toContainText('The loop is done. print shows the final total, 10.');
  await step.getByRole('button', { name: 'Previous' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(step.getByText('Step 8 of 9')).toBeVisible();
  await expect(step.locator('[data-active-line]')).toContainText('total = total + x');
  await expect(step.getByRole('row', { name: /^total/ })).toContainText('changed');
});

test('a simulated trace carries the Simulated trace badge', async ({ page }) => {
  const step = page.locator('[data-step-through="demo-torch-linear"]');
  await expect(step.getByText('Simulated trace')).toBeVisible();
  await expect(step).toContainText('not produced by running the code');
});

test('progressive code marks added and removed lines', async ({ page }) => {
  const prog = page.locator('[data-progressive="demo-matmul-stages"]');
  await prog.getByRole('tab', { name: '3. A @ B' }).click();
  const panel = prog.getByRole('tabpanel', { name: '3. A @ B' });
  await expect(panel.locator('[data-diff="add"]').filter({ hasText: 'C = A @ B' })).toHaveCount(1);
  await expect(panel.locator('[data-diff="del"]').filter({ hasText: 'cols = list(zip(*B))' })).toHaveCount(1);
});

test('quiz feedback explains a wrong answer and the exercise hides its solution until asked', async ({
  page,
}) => {
  const quiz = page.locator('#check');
  await quiz.getByRole('radio', { name: '(3, 3)' }).check();
  await quiz.getByRole('button', { name: 'Check answer' }).first().click();
  await expect(quiz).toContainText('That would be B @ A');

  const exercise = page.locator('#exercise');
  await expect(exercise).not.toContainText('zip pairs a[0] with b[0]');
  await exercise.getByRole('button', { name: 'Show hint 1 of 2' }).click();
  await expect(exercise).toContainText('Pair up the items');
  await exercise.getByRole('button', { name: 'Reveal solution' }).click();
  await expect(exercise).toContainText('pairs a[0] with b[0]');
});

test('the demo page has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-code-example="demo-matmul"] [class*="kw"]').first().waitFor(); // highlighted
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

test.describe('Python in the browser @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('runs print(sum(range(5))) and shows 10 with the runtime version', async ({ page }) => {
    const runner = page.locator('#runner');
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('10', { timeout: 90_000 });
    await expect(runner).toContainText(/Python 3\.\d+\.\d+ · Pyodide/);
  });

  test('records a real trace and runs exercise tests', async ({ page }) => {
    const step = page.locator('[data-step-through="demo-squares"]');
    await step.getByRole('button', { name: 'Record trace' }).click();
    await expect(step.getByText('Recorded in Python (Pyodide)')).toBeVisible({ timeout: 90_000 });
    await step.getByRole('button', { name: 'Last step' }).click();
    await expect(step.getByRole('row', { name: /^total/ })).toContainText('14');

    const exercise = page.locator('#exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('dot([1, 2], [3, 4]) should be 11', {
      timeout: 60_000,
    });
    const editor = exercise.getByRole('textbox', { name: 'Your solution code editor' });
    await editor.fill('def dot(a, b):\n    return sum(x * y for x, y in zip(a, b))');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });

  test('stops code that runs longer than 10 seconds', async ({ page }) => {
    const runner = page.locator('#runner');
    await runner.getByRole('textbox').fill('while True:\n    pass');
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('alert')).toContainText('Stopped after 10 seconds', { timeout: 90_000 });
    await runner.getByRole('textbox').fill('print("after restart")');
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toHaveText('after restart', {
      timeout: 90_000,
    });
  });
});
