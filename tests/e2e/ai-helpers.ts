import { expect, type Page } from '@playwright/test';

/** Runs a lesson's Python runner (by its title) and waits for text in the printed output. AI track lessons. */
export async function runPython(page: Page, title: string, text: string) {
  const runner = page.locator('[data-python-runner]').filter({ hasText: title });
  await runner.getByRole('button', { name: 'Run' }).click();
  await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText(text, {
    timeout: 90_000,
  });
}

/** Pastes the exercise solution into the editor and expects every test to pass. */
export async function passExercise(page: Page, solution: string) {
  const exercise = page.locator('#section-exercise');
  await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(solution);
  await exercise.getByRole('button', { name: 'Run tests' }).click();
  await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
}

/** Moves a slider by keyboard steps (positive = right). */
export async function nudge(page: Page, slider: import('@playwright/test').Locator, steps: number) {
  await slider.focus();
  for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
}
