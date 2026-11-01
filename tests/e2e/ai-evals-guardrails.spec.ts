import { expect, test } from '@playwright/test';
import { graderExercise } from '../../content/tracks/ai/reliability/evals-guardrails/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { nudge, passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/reliability/evals-guardrails', 'Evals, hallucination');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('prompt v2 passes 9 of 10 cases where v1 passes 4', async ({ page }) => {
  const totals = page.getByRole('region', { name: 'Totals', exact: true });
  await expect(totals).toContainText('4 of 10');
  await exp(page, 'evals').getByRole('combobox', { name: 'Prompt version' }).selectOption('v2');
  await expect(totals).toContainText('9 of 10');
  await expect(page.locator('[data-case="monthly-refund"]')).toHaveAttribute(
    'data-category',
    'missed answer',
  );
});

test('a strict guardrail catches more and blocks normal questions', async ({ page }) => {
  const counts = page.getByRole('region', { name: 'Counts', exact: true });
  await expect(counts).toContainText('5 of 8');
  await exp(page, 'guardrail').getByRole('combobox', { name: 'Guardrail strictness' }).selectOption('strict');
  await expect(counts).toContainText('7 of 8');
  await expect(page.locator('[data-input="i2"]')).toHaveAttribute('data-outcome', 'wrongly blocked');
  await expect(page.locator('[data-input="i13"]')).toHaveAttribute('data-outcome', 'missed');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the grader prints its checks, and the exercise passes', async ({ page }) => {
    await runPython(page, 'grade.py', "'unsupported': ['100']");
    await passExercise(page, graderExercise.solution);
  });
});
