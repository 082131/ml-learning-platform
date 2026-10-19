import { expect, test } from '@playwright/test';
import { scoresExercise } from '../../content/tracks/ml/foundations/what-is-ml/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/what-is-ml', 'What AI, ML and deep learning');
});

test('typing an email updates the word scores, the code literal and the printed output together', async ({
  page,
}) => {
  const viz = page.locator('[data-viz="Spam filter: hand-written rule vs learned scores"]');
  // Starting email: are −1, you 0, free +3, for −1, lunch −1, today −1 = −1
  await expect(viz.locator('[data-email-score]')).toHaveAttribute('data-email-score', '-1');
  const readout = page.getByRole('region', { name: 'What the code prints' });
  await expect(readout).toContainText('print(rule_is_spam(email))True');

  await page.getByRole('textbox', { name: 'Your email' }).fill('Claim your FREE prize now!');
  // claim 3 + your 0 + free 3 + prize 2 + now 3 = 11
  await expect(viz.locator('[data-email-score]')).toHaveAttribute('data-email-score', '11');
  await expect(page.locator('[data-code-example="spam-filter"]')).toContainText(
    'email = "claim your free prize now"',
  );
  await expect(readout).toContainText('3 + 0 + 3 + 2 + 3 = 11');
  await expect(readout).toContainText('print(is_spam(email)), score > 1True');
});

test('the threshold and keywords change the code and the accuracy on every email', async ({ page }) => {
  const viz = page.locator('[data-viz="Spam filter: hand-written rule vs learned scores"]');
  await expect(viz.getByText('New emails: rule 4 of 6 correct, learned 4 of 6')).toBeVisible();
  const slider = page.getByRole('slider', { name: 'Learned filter: spam if the score is above' });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  // t = 0: "prize draw winner announced today" (score 1) becomes spam, and so does "free for lunch tomorrow".
  await expect(viz.getByText('New emails: rule 4 of 6 correct, learned 5 of 6')).toBeVisible();
  await expect(page.locator('[data-code-example="spam-filter"]')).toContainText('def is_spam(text, threshold=0):');

  await page.getByRole('textbox', { name: /Hand-written rule/ }).fill('free, prize, winner');
  await expect(page.locator('[data-code-example="spam-filter"]')).toContainText(
    'KEYWORDS = {"free", "prize", "winner"}',
  );
  await expect(viz.getByText('New emails: rule 4 of 6 correct')).toBeVisible();
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-code-example="spam-filter"] [class*="kw"]').first().waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 120_000 });

  test('the runner prints the real output and the exercise passes with the solution', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'spam_new_emails.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(
      '4 of 6 new emails correct',
      { timeout: 90_000 },
    );
    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(scoresExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});
