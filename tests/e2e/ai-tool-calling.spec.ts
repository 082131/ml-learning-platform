import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { toolResultExercise } from '../../content/tracks/ai/agents/tool-calling/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/ai/agents/tool-calling';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tool calling, agents and workflows');
});

const controls = (page: import('@playwright/test').Page) =>
  page.locator('[data-experiment="agent"]').filter({ has: page.getByRole('combobox', { name: 'Task' }) });
const loop = (page: import('@playwright/test').Page) => page.locator('[data-viz^="Agent loop"]');

test('stepping through the failure task shows a real error, the retry and the answer', async ({ page }) => {
  const viz = loop(page);
  await expect(viz.locator('[data-event]')).toHaveCount(1);
  await expect(viz).toContainText('Step 1 of 9');
  const next = viz.getByRole('button', { name: 'Next step' });
  for (let i = 0; i < 4; i++) await next.click();
  const failed = viz.locator('[data-status="error"]');
  await expect(failed).toContainText('is_error: true');
  await expect(failed).toContainText('Unexpected character "×"');
  await expect(failed).toContainText('Ran in your browser');
  await expect(viz.locator('[data-event="model"]').first()).toContainText('Scripted model turn');

  await viz.getByRole('button', { name: 'Show all' }).click();
  await expect(viz.locator('[data-status="ok"]').last()).toContainText('1152');
  await expect(viz.locator('[data-status="answer"]')).toContainText('$1,152 per year');
  await expect(page.getByRole('region', { name: 'This run in the step-through' })).toContainText('3 (1)');
});

test('allowing no failed calls stops the loop and updates the code', async ({ page }) => {
  const slider = controls(page).getByRole('slider', { name: 'Failed tool calls allowed' });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  const viz = loop(page);
  await viz.getByRole('button', { name: 'Show all' }).click();
  await expect(viz.locator('[data-status="tool-errors"]')).toContainText('more than the limit of 0');
  await expect(viz.locator('[data-status="answer"]')).toHaveCount(0);
  await expect(page.locator('[data-code-example="agent-loop-api"]')).toContainText(
    'def run_agent(question, max_steps=6, max_tool_errors=0):',
  );
});

test('the tool playground validates arguments and runs the tools', async ({ page }) => {
  const exp = page.locator('[data-experiment="tool-playground"]').first();
  const result = page.getByRole('region', { name: 'Tool result' });
  await expect(result).toContainText('Unexpected character "×"');
  const args = exp.getByRole('textbox', { name: 'Arguments (JSON)' });
  await args.fill('{"expression": "12 * 10"}');
  await expect(result).toContainText('120');
  await args.fill('{"expr": "12 * 10"}');
  await expect(result).toContainText('unknown argument "expr"');
  await exp.getByRole('combobox', { name: 'Tool' }).selectOption('search_docs');
  await args.fill('{"query": "refund monthly plan"}');
  await expect(result).toContainText('(Refunds and cancellations)');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="agent-loop-api"] [class*="kw"]').first().waitFor();
  await loop(page).getByRole('button', { name: 'Show all' }).click();
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

  test('the agent loop runner prints the failure and the retry, and the exercise passes', async ({
    page,
  }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'agent_loop.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const out = runner.getByRole('group', { name: 'Printed output' });
    await expect(out).toContainText("SyntaxError: invalid character '×' (U+00D7)", { timeout: 90_000 });
    await expect(out).toContainText('$1,152 per year.');
    await expect(out).toContainText('Stopped: 1 failed tool call(s), limit 0.');
    const exercise = page.locator('#section-exercise');
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(toolResultExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
