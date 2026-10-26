// Code for project-math. The output was produced with NumPy 2.5.3 on CPython 3.13, running this script with the
// reference solutions of the two exercises in quiz.ts saved as my_math.py.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const checkCode: CodeExample = {
  id: 'project-math-check',
  language: 'python',
  source: `import numpy as np
from my_math import fit_line, matmul

rng = np.random.default_rng(0)
A = rng.integers(-5, 6, size=(3, 4))
B = rng.integers(-5, 6, size=(4, 2))
print(A @ B)
print(np.array_equal(np.array(matmul(A.tolist(), B.tolist())), A @ B))

w, b = fit_line([0, 1, 2, 3], [1, 2, 5, 6], lr=0.1, steps=2000)
print(round(w, 6), round(b, 6))
print(np.polyfit([0, 1, 2, 3], [1, 2, 5, 6], 1))`,
  annotations: [
    {
      id: 'random',
      range: { line: 5, startCol: 4, endCol: 16 },
      match: 'rng.integers',
      kind: 'framework',
      title: 'Random test matrices',
      what: 'Integer matrices with entries from −5 to 5, from a seeded generator.',
      why: 'Random inputs catch mistakes that a hand-picked example can hide, and the seed makes a failure repeatable.',
    },
    {
      id: 'tolist',
      range: { line: 8, startCol: 37, endCol: 45 },
      match: 'A.tolist',
      kind: 'framework',
      title: 'A.tolist()',
      what: 'Converts the NumPy array into nested Python lists, the input your matmul expects.',
      why: 'Your function is tested on plain lists, so NumPy cannot do the work for it.',
    },
    {
      id: 'array-equal',
      range: { line: 8, startCol: 6, endCol: 20 },
      match: 'np.array_equal',
      kind: 'framework',
      title: 'np.array_equal',
      what: 'True when both arrays have the same shape and the same entries.',
      why: 'Integer products are exact, so exact equality is the right test. For floats, use np.allclose.',
    },
    {
      id: 'polyfit',
      range: { line: 12, startCol: 6, endCol: 16 },
      match: 'np.polyfit',
      kind: 'framework',
      title: 'np.polyfit(x, y, 1)',
      what: 'The least-squares straight line, as [slope, intercept], solved directly rather than by iteration.',
      why: 'An independent answer to compare gradient descent against.',
    },
  ],
  expectedOutput: '[[  7  -5]\n [-35 -42]\n [ 22  30]]\nTrue\n1.8 0.8\n[1.8 0.8]',
};

export const brief: ProjectBrief = {
  goal: 'Write the two computations at the heart of machine learning, matrix multiplication and gradient descent, in plain Python, and show with tests that they give the same answers as NumPy.',
  dataset:
    'No download. Random integer matrices from a seeded NumPy generator for matmul, and the four points (0, 1), (1, 2), (2, 5), (3, 6) from the loss and optimization lesson for the line fit, plus any small datasets you make up.',
  milestones: [
    'matmul(A, B) works on lists of rows and raises ValueError on a shape mismatch',
    'matmul agrees with NumPy’s @ on random integer matrices of several shapes',
    'fit_line(xs, ys, lr, steps) runs gradient descent on the mean squared error',
    'fit_line reaches np.polyfit’s line within 1e-6 on two datasets',
    'A learning rate that is too large is detected: the loss goes up, and your code says so',
    'A short write-up: how many steps the line fit needs for three learning rates, and why',
  ],
  rubric: [
    {
      criterion: 'Correctness',
      detail:
        'Both functions pass the exercises’ tests and the NumPy comparison script prints True and the polyfit line.',
    },
    {
      criterion: 'Tests',
      detail:
        'Each function has at least one hand-worked example, one comparison with NumPy and one edge case (a shape mismatch, zero steps).',
    },
    {
      criterion: 'Floating point',
      detail:
        'Float results are compared with a tolerance, integer results exactly, and the write-up says why.',
    },
    {
      criterion: 'Learning rate',
      detail:
        'The write-up names a rate that converges slowly, one that converges quickly and one that diverges, with the loss after a fixed number of steps for each.',
    },
  ],
  hints: [
    'Get matmul right on the 2 × 3 by 3 × 2 example from the matrix multiplication lesson before trying random matrices.',
    'For fit_line, print the loss every 100 steps. It should fall every time; if it rises, the learning rate is too large.',
    'For these four points, rates above about 0.238 diverge (2 divided by the largest curvature, 8.41).',
    'np.polyfit(xs, ys, 1) returns [slope, intercept]: compare w with the first entry and b with the second.',
  ],
};
