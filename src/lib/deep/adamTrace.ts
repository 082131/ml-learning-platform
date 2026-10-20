import { array, scalar, text } from '../trace/values';
import type { Trace, TraceStep, TraceValue } from '../types';
import { fmt, fmtVec, type Hyper, type OptRun, type Surface, type Vec2 } from './optimizers';

/**
 * Adam written out in NumPy. The loop runs up to the inspected step t, so the code shown is the
 * code whose last iteration the step-through explains. Slots come from adamSlots.
 */
export const ADAM_SOURCE = `import numpy as np

def grad(p):
    x, y = p
    return np.array({{grad}})

lr, beta1, beta2, eps = {{lr}}, {{beta1}}, {{beta2}}, 1e-8
theta = np.array({{start}})
m = np.zeros(2)
v = np.zeros(2)
for t in range(1, {{t}} + 1):
    g = grad(theta)
    m = beta1 * m + (1 - beta1) * g
    v = beta2 * v + (1 - beta2) * g ** 2
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    theta = theta - lr * m_hat / (np.sqrt(v_hat) + eps)
print(theta)`;

const LINE = { grad: 3, hyper: 7, theta0: 8, m0: 9, v0: 10, loop: 11, g: 12, m: 13, v: 14, mHat: 15, vHat: 16, step: 17, print: 18 };

/** A Python float literal: always with a decimal point, so NumPy builds a float array. */
const pyFloat = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export function adamSlots(surface: Surface, h: Hyper, t: number): Record<string, string> {
  return {
    grad: surface.python.grad,
    lr: String(h.adamLr),
    beta1: String(h.beta1),
    beta2: String(h.beta2),
    start: `[${surface.start.map(pyFloat).join(', ')}]`,
    t: String(t),
  };
}

const vec = (p: Vec2) => array([...p]);

/**
 * A computed trace of the Adam code for step t of `run` (an Adam run on `surface`): the setup,
 * one step summarizing iterations 1 to t − 1, then every line of iteration t with its numbers.
 */
export function buildAdamTrace(surface: Surface, h: Hyper, run: OptRun, t: number): Trace {
  if (run.id !== 'adam') throw new Error('buildAdamTrace needs an Adam run');
  const last = Math.max(1, Math.min(t, run.steps.length));
  const s = run.steps[last - 1]!;
  const prev = run.steps[last - 2];
  const hyper = { lr: scalar(h.adamLr), beta1: scalar(h.beta1), beta2: scalar(h.beta2), eps: scalar(h.eps) };
  const zeros: Vec2 = [0, 0];
  const steps: TraceStep[] = [
    {
      range: { line: LINE.grad },
      vars: {},
      note: `grad(p) returns the gradient of ${surface.formula} at p = (x, y): the slope of the loss in each direction.`,
    },
    {
      range: { line: LINE.hyper },
      vars: { ...hyper },
      note: `Adam's settings: learning rate η = ${h.adamLr}, β₁ = ${h.beta1} (how much of the old mean gradient m to keep), β₂ = ${h.beta2} (the same for the mean squared gradient v), and ε = 1e-8 to avoid dividing by 0.`,
    },
    {
      range: { line: LINE.theta0 },
      vars: { ...hyper, theta: vec(surface.start) },
      note: `θ (theta) holds the two parameters (x, y), shape (2,). It starts at ${fmtVec(surface.start)}.`,
    },
    {
      range: { line: LINE.m0 },
      vars: { ...hyper, theta: vec(surface.start), m: vec(zeros) },
      note: 'm, the running mean of the gradient, starts at zero: shape (2,).',
    },
    {
      range: { line: LINE.v0 },
      vars: { ...hyper, theta: vec(surface.start), m: vec(zeros), v: vec(zeros) },
      note: 'v, the running mean of the squared gradient, starts at zero too.',
    },
  ];
  // State at the start of iteration t, after iterations 1..t−1.
  const before: Record<string, TraceValue> = {
    ...hyper,
    theta: vec(s.theta),
    m: vec(prev?.m ?? zeros),
    v: vec(prev?.v ?? zeros),
  };
  if (prev) {
    before.t = scalar(last - 1);
    before.g = vec(prev.g);
    before.m_hat = vec(prev.mHat!);
    before.v_hat = vec(prev.vHat!);
    steps.push({
      range: { line: LINE.loop },
      vars: { ...before },
      note: `Iterations t = 1 to ${last - 1} ran the same six lines (skipped here). These are the values they left behind; θ is now ${fmtVec(s.theta)}.`,
    });
  }
  const vars = { ...before, t: scalar(last) };
  const c1 = 1 - h.beta1 ** last;
  const c2 = 1 - h.beta2 ** last;
  const push = (line: number, name: string, value: TraceValue, note: string) => {
    vars[name as keyof typeof vars] = value;
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  steps.push({ range: { line: LINE.loop }, vars: { ...vars }, note: `t = ${last}: the update this step-through explains.` });
  push(LINE.g, 'g', vec(s.g), `The gradient at θ = ${fmtVec(s.theta)} is g = ${fmtVec(s.g)}.`);
  push(
    LINE.m,
    'm',
    vec(s.m!),
    `m = ${h.beta1}·${fmtVec(prev?.m ?? zeros)} + ${fmt(1 - h.beta1)}·${fmtVec(s.g)} = ${fmtVec(s.m!)}: a running mean of g.`,
  );
  push(
    LINE.v,
    'v',
    vec(s.v!),
    `v = ${h.beta2}·${fmtVec(prev?.v ?? zeros)} + ${fmt(1 - h.beta2)}·g² = ${fmtVec(s.v!)}: a running mean of g², element by element.`,
  );
  push(
    LINE.mHat,
    'm_hat',
    vec(s.mHat!),
    `Bias correction: 1 − β₁^${last} = ${fmt(c1)}, so m̂ = m / ${fmt(c1)} = ${fmtVec(s.mHat!)}. m started at 0, so early on it is too small; this undoes that.`,
  );
  push(
    LINE.vHat,
    'v_hat',
    vec(s.vHat!),
    `1 − β₂^${last} = ${fmt(c2)}, so v̂ = v / ${fmt(c2)} = ${fmtVec(s.vHat!)}.`,
  );
  push(
    LINE.step,
    'theta',
    vec(s.next),
    `Each coordinate moves by η·m̂ / (√v̂ + ε) = ${fmtVec(s.delta)}, so θ = ${fmtVec(s.theta)} − ${fmtVec(s.delta)} = ${fmtVec(s.next)}.`,
  );
  steps.push({
    range: { line: LINE.print },
    vars: { ...vars, output: text(fmtVec(s.next)) },
    note: `print shows θ after ${last} step${last === 1 ? '' : 's'} (NumPy prints it with its own spacing; values here are rounded to 4 decimals).`,
  });
  return { source: 'computed', steps };
}
