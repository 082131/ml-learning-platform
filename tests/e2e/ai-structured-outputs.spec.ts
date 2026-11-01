import { expect, test } from '@playwright/test';
import { parseExercise } from '../../content/tracks/ai/prompting/structured-outputs/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { passExercise, runPython } from './ai-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ai/prompting/structured-outputs', 'structured outputs');
});

const exp = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`[data-experiment="${id}"]`).first();

test('unwrapping a fenced reply makes it valid', async ({ page }) => {
  const check = page.locator('[data-viz="Parse, validate, then use or retry"] [data-valid]').first();
  await expect(check).toHaveAttribute('data-valid', 'false');
  await exp(page, 'triage')
    .getByRole('combobox', { name: 'Unwrap a ```json fence before parsing' })
    .selectOption('yes');
  await expect(check).toHaveAttribute('data-valid', 'true');
});

test('turning fence unwrapping off drops prompt A from 6 to 5', async ({ page }) => {
  const scores = page.getByRole('region', { name: 'Scores', exact: true });
  await expect(scores).toContainText('6');
  await exp(page, 'prompt-compare')
    .getByRole('combobox', { name: 'Unwrap ```json fences when scoring' })
    .selectOption('no');
  await expect(scores).toContainText('5');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });
  test('the validator prints its verdicts, and the exercise passes', async ({ page }) => {
    await runPython(page, 'check_ticket.py', "category 'payments' is not allowed");
    await passExercise(page, parseExercise.solution);
  });
});
