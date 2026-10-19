import { describe, expect, it } from 'vitest';
import { fillExample } from '@/lib/code/slots';
import { validateExample, validateTrace } from '@/lib/code/validate';
import { validateAssessment } from '@/lib/quiz';
import { buildRunningSumTrace } from '@/lib/trace/runningSum';
import * as demo from './demoContent';

describe('demo content', () => {
  it('examples, traces and questions pass the same validation as lessons', () => {
    const examples = [
      demo.matmulExample,
      demo.runningSumExample,
      demo.torchExample,
      demo.squaresExample,
      demo.stagesExample,
    ];
    expect(examples.flatMap(validateExample)).toEqual([]);
    expect(validateTrace(demo.torchTrace, demo.torchExample.source)).toEqual([]);
    const sum = fillExample(demo.runningSumExample, { xs: [3, 1, 4] });
    expect(sum.source.split('\n')[0]).toBe('xs = [3, 1, 4]');
    expect(validateTrace(buildRunningSumTrace([3, 1, 4]), sum.source)).toEqual([]);
    expect(validateAssessment(demo.questions, [demo.dotExercise])).toEqual([]);
  });

  it('the simulated Linear output matches x @ W.T + b worked by hand', () => {
    const [x0, x1] = [1, 2];
    const [w0, w1] = [0.5, -1];
    expect(x0 * w0 + x1 * w1 + 0.25).toBe(-1.25);
    expect(demo.torchTrace.steps.at(-1)?.vars.y).toEqual({ kind: 'array', shape: [1, 1], data: [[-1.25]] });
  });

  it('the matmul numbers in the quiz match the computation', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const B = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    const C = A.map((row) => B[0]!.map((_, j) => row.reduce((acc, a, k) => acc + a * B[k]![j]!, 0)));
    expect(C).toEqual([
      [58, 64],
      [139, 154],
    ]);
    expect(demo.questions.find((q) => q.id === 'entry')).toMatchObject({ answer: C[1]![0] });
  });
});
