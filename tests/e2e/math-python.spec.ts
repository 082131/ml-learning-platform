import { expect, test } from '@playwright/test';
import type { CodeExample, Exercise } from '../../src/lib/types';
import * as scalarsVectorsCode from '../../content/tracks/ml/math/scalars-vectors/code';
import * as scalarsVectorsQuiz from '../../content/tracks/ml/math/scalars-vectors/quiz';
import * as dotProductCode from '../../content/tracks/ml/math/dot-product/code';
import * as dotProductQuiz from '../../content/tracks/ml/math/dot-product/quiz';
import * as matricesCode from '../../content/tracks/ml/math/matrices/code';
import * as matricesQuiz from '../../content/tracks/ml/math/matrices/quiz';
import * as matrixMultiplicationCode from '../../content/tracks/ml/math/matrix-multiplication/code';
import * as matrixMultiplicationQuiz from '../../content/tracks/ml/math/matrix-multiplication/quiz';
import * as tensorsCode from '../../content/tracks/ml/math/tensors/code';
import * as tensorsQuiz from '../../content/tracks/ml/math/tensors/quiz';
import * as functionsDerivativesCode from '../../content/tracks/ml/math/functions-derivatives/code';
import * as functionsDerivativesQuiz from '../../content/tracks/ml/math/functions-derivatives/quiz';
import * as gradientsChainRuleCode from '../../content/tracks/ml/math/gradients-chain-rule/code';
import * as gradientsChainRuleQuiz from '../../content/tracks/ml/math/gradients-chain-rule/quiz';
import * as probabilityCode from '../../content/tracks/ml/math/probability/code';
import * as probabilityQuiz from '../../content/tracks/ml/math/probability/quiz';
import * as statisticsIntuitionCode from '../../content/tracks/ml/math/statistics-intuition/code';
import * as statisticsIntuitionQuiz from '../../content/tracks/ml/math/statistics-intuition/quiz';
import * as lossOptimizationCode from '../../content/tracks/ml/math/loss-optimization/code';
import * as lossOptimizationQuiz from '../../content/tracks/ml/math/loss-optimization/quiz';
import * as projectMathCode from '../../content/tracks/ml/math/project-math/code';
import * as projectMathQuiz from '../../content/tracks/ml/math/project-math/quiz';
import { openMathLesson } from './math-helpers';
import { servePyodideLocally } from './pyodide';

// Every Pyodide runner and exercise in the math chapter, run in the browser: each runner must print the output
// the lesson states, and each reference solution must pass its own tests.
const LESSONS: [string, Record<string, unknown>, Record<string, unknown>][] = [
  ['scalars-vectors', scalarsVectorsCode, scalarsVectorsQuiz],
  ['dot-product', dotProductCode, dotProductQuiz],
  ['matrices', matricesCode, matricesQuiz],
  ['matrix-multiplication', matrixMultiplicationCode, matrixMultiplicationQuiz],
  ['tensors', tensorsCode, tensorsQuiz],
  ['functions-derivatives', functionsDerivativesCode, functionsDerivativesQuiz],
  ['gradients-chain-rule', gradientsChainRuleCode, gradientsChainRuleQuiz],
  ['probability', probabilityCode, probabilityQuiz],
  ['statistics-intuition', statisticsIntuitionCode, statisticsIntuitionQuiz],
  ['loss-optimization', lossOptimizationCode, lossOptimizationQuiz],
  ['project-math', projectMathCode, projectMathQuiz],
];

const values = (mod: Record<string, unknown>) =>
  Object.values(mod).flatMap((v) => (Array.isArray(v) ? v : [v]));
const runnersOf = (mod: Record<string, unknown>) =>
  values(mod).filter(
    (v): v is CodeExample =>
      typeof v === 'object' &&
      v !== null &&
      (v as CodeExample).run === 'pyodide' &&
      !!(v as CodeExample).expectedOutput,
  );
const exercisesOf = (mod: Record<string, unknown>) =>
  values(mod).filter(
    (v): v is Exercise =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as Exercise).solution === 'string' &&
      !!(v as Exercise).tests,
  );

test.describe('Math chapter Python @network', () => {
  test.describe.configure({ timeout: 300_000 });
  test.beforeEach(async ({ context }) => servePyodideLocally(context));

  for (const [slug, code, quiz] of LESSONS) {
    const runners = runnersOf(code);
    const exercises = exercisesOf(quiz);
    if (!runners.length && !exercises.length) continue;
    test(`${slug}: runners print their stated output and solutions pass`, async ({ page }) => {
      await openMathLesson(page, slug, /./);
      for (const ex of runners) {
        const lastLine = ex.source.trim().split('\n').at(-1)!;
        const runner = page.locator('[data-python-runner]').filter({ hasText: lastLine });
        await runner.getByRole('button', { name: 'Run' }).click();
        await expect(runner.getByRole('group', { name: 'Printed output' }), ex.id).toHaveText(
          ex.expectedOutput!,
          {
            timeout: 120_000,
          },
        );
      }
      for (const ex of exercises) {
        const box = page.locator(`[data-exercise="${ex.id}"]`);
        await box.getByRole('textbox', { name: 'Your solution code editor' }).fill(ex.solution);
        await box.getByRole('button', { name: 'Run tests' }).click();
        await expect(box, ex.id).toContainText('All tests passed.', { timeout: 120_000 });
      }
    });
  }
});
