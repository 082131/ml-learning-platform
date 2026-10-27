import { expect, test } from '@playwright/test';
import { momentumExercise } from '../../content/tracks/ml/deep/optimizers/quiz';
import { batchesExercise } from '../../content/tracks/ml/deep/training-loop/quiz';
import { transposeExercise } from '../../content/tracks/ml/deep/pytorch-basics/quiz';
import { standardizeExercise } from '../../content/tracks/ml/deep/project-neural-net/quiz';
import { servePyodideLocally } from './pyodide';

const CASES = [
  ['optimizers', momentumExercise],
  ['training-loop', batchesExercise],
  ['pytorch-basics', transposeExercise],
  ['project-neural-net', standardizeExercise],
] as const;

test.describe('deep training exercises in Pyodide @network', () => {
  test.describe.configure({ timeout: 150_000 });
  for (const [lesson, exercise] of CASES)
    test(`${lesson}: the starter fails the tests and the solution passes`, async ({ page, context }) => {
      await servePyodideLocally(context);
      await page.goto(`./#/learn/ml/deep/${lesson}`);
      const section = page.locator('#section-exercise');
      await section.getByRole('button', { name: 'Run tests' }).click();
      await expect(section.getByRole('alert')).toBeVisible({ timeout: 90_000 });
      await section.getByRole('textbox', { name: 'Your solution code editor' }).fill(exercise.solution);
      await section.getByRole('button', { name: 'Run tests' }).click();
      await expect(section).toContainText('All tests passed.', { timeout: 60_000 });
    });
});
