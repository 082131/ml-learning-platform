// Code for loss-optimization. Outputs and error messages were produced by running the code on CPython 3.13.
// The 2-D descent readout reproduces the printout exactly for every slider setting; this is checked
// against CPython output in src/lib/optimization/descent2d.test.ts.
import { gradientDescentExperiment } from '@/lib/ml/gradientDescent';
import { descent2DExperiment, descentSlots } from '@/lib/optimization/descent2d';
import type { CodeExample } from '@/lib/types';

export const experiment1d = gradientDescentExperiment('descent-1d', { lr: 0.1, x0: 6, steps: 20 });

export const experiment2d = descent2DExperiment('descent-2d', {
  lr: 0.1,
  w0: -1,
  b0: 5,
  steps: 30,
  inspect: 0,
});

export const descent1dCode: CodeExample = {
  id: 'descent-1d-code',
  language: 'python',
  source: `def f(x):
    return (x - 2) ** 2 + 1

def df(x):
    return 2 * (x - 2)

x = 6.0
lr = 0.1
for step in range(20):
    x = x - lr * df(x)
print(x, f(x))`,
  annotations: [
    {
      id: 'update',
      range: { line: 10, startCol: 4, endCol: 22 },
      match: 'x = x - lr * df(x)',
      kind: 'variable',
      title: 'The update rule',
      what: 'Move x a small step against the slope: x ← x − η · f′(x).',
      why: 'Where the slope is positive, decreasing x lowers f; where it is negative, increasing x does. The minus sign handles both.',
    },
    {
      id: 'lr',
      range: { line: 8, startCol: 0, endCol: 2 },
      match: 'lr',
      kind: 'variable',
      title: 'lr: the learning rate η',
      what: 'How far each step moves, as a multiple of the slope.',
      why: 'Too small and training crawls; too large and every step overshoots the minimum.',
    },
  ],
  expectedOutput: '2.046116860184274 1.002126764793256',
};

export const descent2dCode: CodeExample = {
  id: 'descent-2d-code',
  language: 'python',
  source: `xs = [0, 1, 2, 3]
ys = [1, 2, 5, 6]
w, b = {{w0}}, {{b0}}
lr = {{lr}}
for step in range({{steps}}):
    errs = [w * x + b - y for x, y in zip(xs, ys)]
    dw = 2 * sum(e * x for e, x in zip(errs, xs)) / len(xs)
    db = 2 * sum(errs) / len(xs)
    w, b = w - lr * dw, b - lr * db
loss = sum((w * x + b - y) * (w * x + b - y) for x, y in zip(xs, ys)) / len(xs)
print(round(w, 4), round(b, 4), round(loss, 4))`,
  slots: descentSlots,
  annotations: [
    {
      id: 'errs',
      range: { line: 6, startCol: 4, endCol: 8 },
      match: 'errs',
      kind: 'variable',
      title: 'errs: one error per example',
      what: 'The prediction w·x + b minus the target, for each of the four points.',
      why: 'Both partial derivatives are built from these errors.',
    },
    {
      id: 'dw',
      range: { line: 7, startCol: 4, endCol: 6 },
      match: 'dw',
      kind: 'variable',
      title: 'dw = ∂L/∂w',
      what: 'The mean of 2 · error · x: the chain rule for the mean squared error, averaged over examples.',
      why: 'The same formula as in the gradients lesson, one example at a time.',
    },
    {
      id: 'simultaneous',
      range: { line: 9, startCol: 4, endCol: 35 },
      match: 'w, b = w - lr * dw, b - lr * db',
      kind: 'variable',
      title: 'Update both parameters at once',
      what: 'The new w and b both use the gradient computed at the old point.',
      why: 'Updating w first and then computing db from the new w would be a different (and inconsistent) algorithm.',
    },
  ],
};
