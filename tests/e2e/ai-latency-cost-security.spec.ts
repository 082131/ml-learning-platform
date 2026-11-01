import { expect, test } from '@playwright/test';
import { policyExercise } from '../../content/tracks/ai/ops/latency-cost-security/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/ops/latency-cost-security', 'Caching, latency, cost');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('prompt caching lowers the monthly estimate from $14,400 to $7,920', async ({ page }) => {
  const estimate = page.getByRole('region', { name: 'Estimate', exact: true });
  await expect(estimate).toContainText('$14,400');
  await exp(page, 'cost')
    .getByRole('combobox', { name: 'Prompt caching of the fixed prefix' })
    .selectOption('on');
  await expect(estimate).toContainText('$7,920');
  await expect(estimate).toContainText('0.69 s');
});

test('the recipient check stops the email but not the delete; the task allowlist stops both', async ({
  page,
}) => {
  const outcome = page.getByRole('region', { name: 'Outcome', exact: true });
  const table = page.locator('[data-viz="Tool calls after reading an injected note"]');
  await expect(outcome).toContainText('2');
  await exp(page, 'tool-policy')
    .getByRole('combobox', { name: 'Email only to the user’s own address' })
    .selectOption('on');
  await expect(table.locator('[data-tool="send_email"]')).toHaveAttribute('data-decision', 'blocked');
  await expect(table.locator('[data-tool="delete_note"]')).toHaveAttribute('data-decision', 'runs');
  await exp(page, 'tool-policy')
    .getByRole('combobox', { name: 'Only the tools this task needs' })
    .selectOption('on');
  await expect(table.locator('[data-tool="delete_note"]')).toHaveAttribute('data-decision', 'blocked');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the cost runner prints all four estimates, and the exercise passes', async ({ page }) => {
    await runPython(page, 'cost.py', 'shorter output:   $4,896');
    await passExercise(page, policyExercise.solution);
  });
});
