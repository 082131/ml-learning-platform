import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'quality/observability-testing', 'Data quality, lineage');
});

test('incidents and tolerance change the checks, the decision, the code and the printout together', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="quality"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="checks-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-check="schema"]')).toHaveAttribute('data-passed', 'false');
  await expect(viz.locator('[data-decision]')).toHaveAttribute('data-decision', 'stop');
  await expect(readout).toContainText("FAIL  schema    block  missing ['amount'], unexpected ['amount_eur']");

  await viz.getByLabel('What happened to today’s load').selectOption('none');
  await expect(code).toContainText('INCIDENT = "none"');
  await expect(viz.locator('[data-decision]')).toHaveAttribute('data-decision', 'publish');
  await expect(readout).toContainText('PASS  volume    warn   902 rows, -10.1% vs median 1003');

  const slider = viz.getByRole('slider', { name: 'Volume tolerance (allowed change vs the 7-day median)' });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(code).toContainText('TOLERANCE = 0.1');
  await expect(viz.locator('[data-check="volume"]')).toHaveAttribute('data-passed', 'false');
  await expect(viz.locator('[data-decision]')).toHaveAttribute('data-decision', 'warn');
  await expect(readout).toContainText('FAIL  volume    warn   902 rows, -10.1% vs median 1003');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'checks-python');
});
