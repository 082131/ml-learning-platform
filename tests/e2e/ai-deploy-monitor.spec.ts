import { expect, test } from '@playwright/test';
import { bucketExercise } from '../../content/tracks/ai/ops/deploy-monitor/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/ops/deploy-monitor', 'Deploying and monitoring');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('without rollback the regression keeps serving; with rollback it stops after the alert', async ({
  page,
}) => {
  await expect(page.getByRole('region', { name: '24 hours', exact: true })).toContainText('1,171');
  const rollback = page.getByRole('region', { name: '24 hours with rollback', exact: true });
  await expect(rollback).toContainText('fired in hour 5');
  await expect(rollback).toContainText('267');
  await expect(page.locator('[data-experiment="canary"] [data-alert-hour]')).toHaveAttribute(
    'data-alert-hour',
    '5',
  );
});

test('at 1% traffic the alert never fires; with no real change, seed 2 raises a false alarm', async ({
  page,
}) => {
  const rollback = page.getByRole('region', { name: '24 hours with rollback', exact: true });
  await nudge(page, exp(page, 'canary').getByRole('slider', { name: 'Traffic to the new version' }), -1);
  await expect(rollback).toContainText('did not fire in 24 hours');
  await nudge(page, exp(page, 'canary').getByRole('slider', { name: 'Traffic to the new version' }), 1);
  await exp(page, 'canary')
    .getByRole('combobox', { name: 'New version’s true bad-answer rate' })
    .selectOption('same');
  await exp(page, 'canary').getByRole('spinbutton', { name: 'Random seed' }).fill('2');
  await expect(rollback).toContainText('fired in hour 11');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the alert rule fires in hour 5, and the exercise passes', async ({ page }) => {
    await runPython(page, 'canary.py', 'z=2.41  -> ALERT: roll back');
    await passExercise(page, bucketExercise.solution);
  });
});
