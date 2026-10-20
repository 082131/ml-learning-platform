// Code for the optimizers lesson. The Adam loop was run with NumPy 2.5.3 on CPython 3.13 for the
// default settings, and the PyTorch snippet with PyTorch 2.14.1 on CPU; their outputs are copied here
// and the same numbers are checked against our TypeScript in src/lib/deep/optimizers.test.ts.
import { ADAM_SOURCE, adamSlots } from '@/lib/deep/adamTrace';
import { hyperOf, optimizerRaceExperiment, type RaceState } from '@/lib/deep/optimizerExperiment';
import { surfaceOf } from '@/lib/deep/optimizers';
import type { CodeExample } from '@/lib/types';

const ADAM_ID = 'optimizers-adam';

/** One state for the race, the update equations, the Adam code and its step-through. */
export const experiment = optimizerRaceExperiment('optimizer-race', ADAM_ID);

const st = (s: unknown) => s as RaceState;
const slot = (name: string) => (s: unknown) =>
  adamSlots(surfaceOf(st(s).surface), hyperOf(st(s)), st(s).inspect)[name]!;

export const adamCode: CodeExample = {
  id: ADAM_ID,
  language: 'python',
  source: ADAM_SOURCE,
  slots: Object.fromEntries(['grad', 'lr', 'beta1', 'beta2', 'start', 't'].map((n) => [n, slot(n)])),
  annotations: [
    {
      id: 'grad',
      range: { line: 5, startCol: 20, endCol: 28 },
      match: '{{grad}}',
      kind: 'math',
      title: 'The gradient of the surface',
      what: 'The two partial derivatives of the loss at p = (x, y), written out by hand for the selected surface.',
      why: 'In a neural network backpropagation computes this vector; here the surface is small enough to differentiate on paper.',
      output: 'An array of shape (2,)',
    },
    {
      id: 'lr',
      range: { line: 7, startCol: 24, endCol: 30 },
      match: '{{lr}}',
      kind: 'parameter',
      title: 'lr (Adam’s learning rate η)',
      what: 'The largest distance, roughly, that each coordinate moves in one step.',
      why: 'Adam divides by the size of recent gradients, so η sets the step length directly. Filled from the “Adam learning rate” slider.',
    },
    {
      id: 'beta1',
      range: { line: 7, startCol: 32, endCol: 41 },
      match: '{{beta1}}',
      kind: 'parameter',
      title: 'beta1 (β₁)',
      what: 'How much of the old mean gradient m to keep each step.',
      why: 'β₁ = 0.9 averages over about the last 1 / (1 − 0.9) = 10 gradients, which smooths out zigzags.',
    },
    {
      id: 'beta2',
      range: { line: 7, startCol: 43, endCol: 52 },
      match: '{{beta2}}',
      kind: 'parameter',
      title: 'beta2 (β₂)',
      what: 'How much of the old mean squared gradient v to keep.',
      why: 'β₂ = 0.999 averages over about 1000 steps: a slow, stable estimate of how large the gradients are.',
    },
    {
      id: 'eps',
      range: { line: 7, startCol: 54, endCol: 58 },
      match: '1e-8',
      kind: 'parameter',
      title: 'eps (ε)',
      what: 'A tiny number added before dividing.',
      why: 'If a gradient is exactly 0, √v̂ is 0 and the division would blow up.',
    },
    {
      id: 'start',
      range: { line: 8, startCol: 17, endCol: 26 },
      match: '{{start}}',
      kind: 'variable',
      title: 'The start point',
      what: 'θ (theta): the two parameters being optimized, here the coordinates (x, y).',
      why: 'All three optimizers in the race start here, so their paths are comparable.',
      output: 'theta: shape (2,)',
    },
    {
      id: 'zeros',
      range: { line: 9, startCol: 4, endCol: 15 },
      match: 'np.zeros(2)',
      kind: 'framework',
      title: 'np.zeros(2)',
      what: 'An array of two zeros: Adam’s running averages start empty.',
      why: 'Starting at zero is what makes the early averages too small, and why the bias correction below exists.',
    },
    {
      id: 't',
      range: { line: 11, startCol: 18, endCol: 23 },
      match: '{{t}}',
      kind: 'parameter',
      title: 'The inspected step t',
      what: 'The loop runs steps 1 to t, the step chosen with “Inspect step t”.',
      why: 't starts at 1, not 0: the bias correction divides by 1 − βᵗ, which would be 0 at t = 0.',
    },
    {
      id: 'g',
      range: { line: 12, startCol: 8, endCol: 19 },
      match: 'grad(theta)',
      kind: 'function',
      title: 'grad(theta)',
      what: 'The gradient at the current position.',
      why: 'Every optimizer starts from the gradient; they differ in what they do with it.',
    },
    {
      id: 'm-keep',
      range: { line: 13, startCol: 8, endCol: 17 },
      match: 'beta1 * m',
      kind: 'math',
      title: 'beta1 * m',
      what: 'Keeps 90% (for β₁ = 0.9) of the running mean.',
      why: 'This memory is the momentum part of Adam.',
    },
    {
      id: 'm-new',
      range: { line: 13, startCol: 20, endCol: 35 },
      match: '(1 - beta1) * g',
      kind: 'math',
      title: '(1 - beta1) * g',
      what: 'Adds 10% of the new gradient.',
      why: 'The weights 0.9 and 0.1 add up to 1, so m is a weighted average (an exponential moving average).',
    },
    {
      id: 'g2',
      range: { line: 14, startCol: 34, endCol: 40 },
      match: 'g ** 2',
      kind: 'math',
      title: 'g ** 2',
      what: 'Squares each coordinate of the gradient separately (element-wise), not a dot product.',
      why: 'v tracks how large the gradient is in each direction, whatever its sign.',
      output: 'shape (2,)',
    },
    {
      id: 'c1',
      range: { line: 15, startCol: 16, endCol: 32 },
      match: '(1 - beta1 ** t)',
      kind: 'math',
      title: 'Bias correction 1 − β₁ᵗ',
      what: 'At t = 1 it is 0.1, at t = 10 about 0.65, and it approaches 1.',
      why: 'After t steps from zero, m holds only a 1 − β₁ᵗ share of a full average, so dividing by it rescales m to the right size.',
    },
    {
      id: 'c2',
      range: { line: 16, startCol: 16, endCol: 32 },
      match: '(1 - beta2 ** t)',
      kind: 'math',
      title: 'Bias correction 1 − β₂ᵗ',
      what: 'At t = 1 it is 0.001 for β₂ = 0.999, so v is multiplied by 1000.',
      why: 'Without it v̂ would be tiny early on and the first steps would be huge.',
    },
    {
      id: 'scale',
      range: { line: 17, startCol: 20, endCol: 30 },
      match: 'lr * m_hat',
      kind: 'math',
      title: 'lr * m_hat',
      what: 'The step direction: the averaged gradient times η.',
      why: 'Using the average rather than the raw gradient damps zigzags.',
    },
    {
      id: 'sqrt',
      range: { line: 17, startCol: 34, endCol: 48 },
      match: 'np.sqrt(v_hat)',
      kind: 'framework',
      title: 'np.sqrt(v_hat)',
      what: 'The typical gradient size in each coordinate (root of the mean square).',
      why: 'Dividing by it makes steep and flat directions take similar step lengths. This per-coordinate scaling is what “adaptive” means.',
    },
    {
      id: 'eps-add',
      range: { line: 17, startCol: 49, endCol: 54 },
      match: '+ eps',
      kind: 'syntax',
      title: '+ eps',
      what: 'Adds ε outside the square root, as PyTorch does.',
      why: 'Keeps the denominator above 0.',
    },
  ],
};

/** The same Adam update through PyTorch. Output recorded from PyTorch 2.14.1 on CPU (float32 tensors). */
export const torchAdam: CodeExample = {
  id: 'optimizers-torch-adam',
  language: 'python',
  source: `import torch

theta = torch.tensor([-4.0, 1.5], requires_grad=True)
opt = torch.optim.Adam([theta], lr=0.2)
for t in range(1, 4):
    opt.zero_grad()
    loss = 0.5 * (theta[0] ** 2 + 10 * theta[1] ** 2)
    loss.backward()
    opt.step()
    print(t, theta.tolist())`,
  annotations: [
    {
      id: 'requires-grad',
      range: { line: 3, startCol: 34, endCol: 52 },
      match: 'requires_grad=True',
      kind: 'framework',
      title: 'requires_grad=True',
      what: 'Asks PyTorch to record operations on theta so it can compute the gradient.',
      why: 'The optimizer can only update tensors that have gradients.',
    },
    {
      id: 'adam',
      range: { line: 4, startCol: 6, endCol: 22 },
      match: 'torch.optim.Adam',
      kind: 'framework',
      title: 'torch.optim.Adam',
      what: 'PyTorch’s Adam. Defaults: betas=(0.9, 0.999), eps=1e-08.',
      why: 'It keeps m and v for every parameter you give it and applies the same update as the NumPy loop.',
    },
    {
      id: 'lr',
      range: { line: 4, startCol: 32, endCol: 38 },
      match: 'lr=0.2',
      kind: 'parameter',
      title: 'lr=0.2',
      what: 'The learning rate. PyTorch’s default for Adam is 0.001.',
      why: '0.2 matches the race’s default, so you can compare the numbers.',
    },
    {
      id: 'zero',
      range: { line: 6, startCol: 4, endCol: 19 },
      match: 'opt.zero_grad()',
      kind: 'framework',
      title: 'opt.zero_grad()',
      what: 'Clears the gradients from the previous step.',
      why: 'PyTorch adds new gradients to old ones; without this, steps would use the sum of all past gradients.',
    },
    {
      id: 'backward',
      range: { line: 8, startCol: 4, endCol: 19 },
      match: 'loss.backward()',
      kind: 'framework',
      title: 'loss.backward()',
      what: 'Computes the gradient of loss with respect to theta and stores it in theta.grad.',
      why: 'This replaces our hand-written grad function.',
    },
    {
      id: 'step',
      range: { line: 9, startCol: 4, endCol: 14 },
      match: 'opt.step()',
      kind: 'framework',
      title: 'opt.step()',
      what: 'Applies one Adam update to theta using theta.grad.',
      why: 'This is the m, v, m̂, v̂ and θ lines of the NumPy loop in one call.',
    },
    {
      id: 'tolist',
      range: { line: 10, startCol: 13, endCol: 27 },
      match: 'theta.tolist()',
      kind: 'framework',
      title: 'theta.tolist()',
      what: 'Converts the tensor to a Python list of floats for printing.',
      why: 'The float32 values print with float64 digits, which is why −3.8 shows as −3.799999952316284.',
    },
  ],
  expectedOutput: `1 [-3.799999952316284, 1.2999999523162842]
2 [-3.6003329753875732, 1.1012511253356934]
3 [-3.4012467861175537, 0.9049132466316223]`,
};
