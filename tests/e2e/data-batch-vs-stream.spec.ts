import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { lateExercise } from '../../content/tracks/data/processing/batch-vs-stream/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/data/processing/batch-vs-stream';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Batch vs stream');
});

test('changing the lateness changes the timeline, the code and the printed results together', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="stream"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="stream-python"]');
  const readout = page.getByRole('region', { name: 'Stream and batch, compared' });

  await expect(viz.locator('[data-status="dropped"]')).toHaveCount(2);
  await expect(code).toContainText('LATENESS = 3');
  await expect(readout).toContainText('[ 0,  5) count=3 emitted at  9 (latency 4)');
  await expect(readout).toContainText('dropped as late: [(2, 11), (7, 21)]');

  const slider = viz.getByRole('slider', { name: 'Allowed lateness (minutes)' });
  await slider.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(code).toContainText('LATENESS = 6');
  await expect(viz.locator('[data-status="dropped"]')).toHaveCount(1);
  await expect(viz.locator('[data-event="e6"]')).toHaveAttribute('data-status', 'counted');
  await expect(readout).toContainText('[ 0,  5) count=4 emitted at 12 (latency 7)');
  await expect(readout).toContainText('12 of 13 (1 dropped as late)');

  await viz.getByLabel('Window size').selectOption('10');
  await expect(code).toContainText('WINDOW = 10');
  await expect(viz.locator('[data-window]')).toHaveCount(3);
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="stream-python"] [class*="kw"]').first().waitFor();
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

  test('the batch job prints complete counts and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'batch.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '[25, 30) count=1 ready at 30',
      {
        timeout: 90_000,
      },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('(2, 11) and (7, 21) are late', {
      timeout: 60_000,
    });
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(lateExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
