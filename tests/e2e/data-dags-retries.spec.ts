import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, openDataLesson } from './data-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataLesson(page, context, 'orchestration/dags-retries', 'Orchestration, scheduling, retries');
});

test('one more retry turns a blocked run into a successful one, in the timeline, the code and the printout', async ({
  page,
}) => {
  const viz = page.locator('[data-experiment="dag"]').filter({ has: page.getByRole('slider') });
  const code = page.locator('[data-code-example="scheduler-python"]');
  const readout = page.getByRole('region', { name: 'What the code prints' });

  await expect(viz.locator('[data-dag-timeline] [data-state="upstream_failed"]')).toHaveCount(3);
  await expect(viz.locator('[data-task="notify"]')).toHaveAttribute('data-state', 'success');
  await expect(code).toContainText('RETRIES = 1');
  await expect(readout).toContainText('transform          failed   attempts=2 start= 3 end=10');

  const slider = viz.getByRole('slider', { name: 'Retries per task' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(code).toContainText('RETRIES = 2');
  await expect(viz.locator('[data-dag-timeline] [data-state="upstream_failed"]')).toHaveCount(0);
  await expect(readout).toContainText('transform          success  attempts=3 start= 3 end=15');
  await expect(readout).toContainText('run finished at minute 20');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, 'scheduler-python');
});
