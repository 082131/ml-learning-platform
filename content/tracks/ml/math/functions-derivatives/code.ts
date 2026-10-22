// Code for functions-derivatives. Outputs and error messages were produced by running the code with
// CPython 3.13; the experiment's print line is checked against CPython in src/lib/calculus tests.
import { derivativeExperiment, derivativeSlots } from '@/lib/calculus/derivative';
import type { CodeExample } from '@/lib/types';

export const experiment = derivativeExperiment('derivative', { fn: 'square', x: 1, h: '0.1' });

export const differenceCode: CodeExample = {
  id: 'derivative-code',
  language: 'python',
  source: `def f(x):
    return {{f}}

x = {{x}}
h = {{h}}
forward = (f(x + h) - f(x)) / h
central = (f(x + h) - f(x - h)) / (2 * h)
print(f"{forward:.6f} {central:.6f}")`,
  slots: derivativeSlots,
  annotations: [
    {
      id: 'f',
      range: { line: 1, startCol: 4, endCol: 5 },
      match: 'f',
      kind: 'function',
      title: 'f',
      what: 'The function whose slope we want, chosen in the experiment.',
      why: 'Numerical derivatives only need to evaluate f. They never look at its formula.',
    },
    {
      id: 'h',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'h',
      kind: 'parameter',
      title: 'h: the step',
      what: 'How far apart the two points of the secant are.',
      why: 'Smaller h approximates the tangent better, until floating-point round-off takes over (try 1e-12).',
    },
    {
      id: 'forward',
      range: { line: 6, startCol: 0, endCol: 7 },
      match: 'forward',
      kind: 'math',
      title: 'Forward difference',
      what: '(f(x + h) − f(x)) / h: rise over run between x and x + h.',
      why: 'This is the slope of the secant. Its error is roughly proportional to h.',
    },
    {
      id: 'central',
      range: { line: 7, startCol: 0, endCol: 7 },
      match: 'central',
      kind: 'math',
      title: 'Central difference',
      what: '(f(x + h) − f(x − h)) / (2h): a secant centered on x.',
      why: 'Errors on the two sides cancel, so for smooth functions the error is roughly proportional to h², much smaller.',
    },
    {
      id: 'fmt',
      range: { line: 8, startCol: 6, endCol: 36 },
      match: 'f"{forward:.6f} {central:.6f}"',
      kind: 'syntax',
      title: 'f-string with :.6f',
      what: 'Formats each number with exactly 6 digits after the decimal point.',
      why: 'Fixed digits make the two estimates easy to compare. The readout shows this line for the current values.',
    },
  ],
};

/** Shrinking h: the error falls, then round-off makes it grow again. Pure Python, runs in the browser. */
export const stepSweep: CodeExample = {
  id: 'derivative-sweep',
  language: 'python',
  run: 'pyodide',
  source: `def f(x):
    return x * x

x = 1.0
for h in [0.1, 0.01, 0.001, 1e-6, 1e-9, 1e-12, 1e-15]:
    forward = (f(x + h) - f(x)) / h
    print(f"h = {h:<6g}  slope = {forward:.10f}  error = {abs(forward - 2):.1e}")`,
  annotations: [],
  expectedOutput: `h = 0.1     slope = 2.1000000000  error = 1.0e-01
h = 0.01    slope = 2.0100000000  error = 1.0e-02
h = 0.001   slope = 2.0010000000  error = 1.0e-03
h = 1e-06   slope = 2.0000009999  error = 1.0e-06
h = 1e-09   slope = 2.0000001655  error = 1.7e-07
h = 1e-12   slope = 2.0001778012  error = 1.8e-04
h = 1e-15   slope = 2.2204460493  error = 2.2e-01`,
};

/** A gradient check: the exact derivative of a tiny loss against a central difference. */
export const gradientCheck: CodeExample = {
  id: 'derivative-check',
  language: 'python',
  source: `def loss(w):
    return (2 * w - 6) * (2 * w - 6)   # prediction 2·w, target 6

w = 1.0
h = 1e-6
numeric = (loss(w + h) - loss(w - h)) / (2 * h)
exact = 2 * (2 * w - 6) * 2
print(f"{exact} {numeric:.6f}")`,
  annotations: [
    {
      id: 'loss',
      range: { line: 1, startCol: 4, endCol: 8 },
      match: 'loss',
      kind: 'function',
      title: 'loss(w)',
      what: 'The squared error of a one-weight model that predicts 2·w when the answer is 6.',
      why: 'Training changes w to make this smaller, so it needs to know which way the loss slopes.',
    },
    {
      id: 'exact',
      range: { line: 7, startCol: 0, endCol: 5 },
      match: 'exact',
      kind: 'math',
      title: 'The exact derivative',
      what: 'd/dw (2w − 6)² = 2(2w − 6) · 2, using the power rule and the chain rule (next lesson).',
      why: 'At w = 1 it is 2 · (−4) · 2 = −16: increasing w lowers the loss.',
    },
  ],
  expectedOutput: '-16.0 -16.000000',
};
