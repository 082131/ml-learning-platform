import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { leftJoinExercise } from '../../content/tracks/data/relational/joins-indexes/quiz';
import { servePyodideLocally } from './pyodide';

const LESSON = './#/learn/data/relational/joins-indexes';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('joins, indexes');
});

test('changing the join type and an order’s customer changes the tables, the SQL and the printed rows together', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="joins"]').filter({ has: page.locator('[data-viz]') });
  const result = viz.locator('[data-table="result"] tbody tr');
  const sql = page.locator('[data-code-example="join-sql"]');
  const readout = page.getByRole('region', { name: 'Rows the query returns' });

  await expect(result).toHaveCount(4);
  await expect(sql).toContainText('INNER JOIN orders AS o');
  await expect(viz.locator('[data-table="customers"]')).toContainText('not in result');

  await viz.getByLabel('Join type').selectOption('full');
  await expect(result).toHaveCount(6);
  await expect(sql).toContainText('FULL OUTER JOIN orders AS o');
  await expect(readout).toContainText("(4, 'Margaret', None, None)");
  await expect(readout).toContainText('(None, None, 105, 20)');

  // Order 104 loses its customer: Grace becomes unmatched and order 104 joins the padded rows (SQLite agrees).
  await viz.getByLabel('customer_id of order 104').selectOption('NULL');
  await expect(result).toHaveCount(7);
  await expect(readout).toContainText("(2, 'Grace', None, None)");
  await expect(readout).toContainText('(None, None, 104, 8)');
  await expect(readout.locator('[data-status]').first()).toContainText('7');

  await viz.getByRole('button', { name: /Result row 6:/ }).click();
  await expect(viz.locator('[data-join-explain]')).toContainText('Order 105 matches no customer');
  await expect(viz.locator('[data-table="orders"] tr', { hasText: '← source' })).toContainText('105');
});

test('the lookup step-through follows the selected method and counts entries read', async ({ page }) => {
  const exp = page.locator('[data-experiment="lookup"]');
  const readout = exp.getByRole('region', { name: 'Result' });
  await expect(readout).toContainText('[103, 111] 7');
  const code = exp.locator('[data-step-through="lookup-code"]');
  await expect(code).toContainText('found, touched = index_lookup(index, 3)');

  await exp.getByLabel('Method to step through').selectOption('scan');
  await expect(code).toContainText('found, touched = scan(orders, 3)');
  await expect(readout).toContainText('[103, 111] 16');

  const slider = exp.getByRole('slider', { name: 'Rows in orders (n)' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(readout).toContainText('[103, 111, 119, 127] 32');
  await expect(readout).toContainText('10 = 5 binary-search probes + 5 read forward');
  await expect(code).toContainText('for i in range(32)');

  await code.getByRole('button', { name: 'Last' }).click();
  await expect(code).toContainText(
    'print shows the matching order ids and the count: [103, 111, 119, 127] 32.',
  );
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="join-sql"] [class*="kw"]').first().waitFor();
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

  test('the hash join prints the left join and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'hash_join.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '4 Margaret None None',
      {
        timeout: 90_000,
      },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise.getByRole('alert')).toContainText('the lesson tables should give 5 rows', {
      timeout: 60_000,
    });
    await exercise
      .getByRole('textbox', { name: 'Your solution code editor' })
      .fill(leftJoinExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
