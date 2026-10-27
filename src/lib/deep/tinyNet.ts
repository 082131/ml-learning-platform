/**
 * The pytorch-basics lesson's network: nn.Linear(2, 3) → tanh → nn.Linear(3, 1) → sigmoid, trained with
 * SGD on XOR. `tiny_net.py` is the exact code shown in the lesson; `tiny_net.json` holds what it printed and
 * the intermediate values, recorded by gen_tiny_net.py from a run of PyTorch 2.14.1 on CPU (float32).
 * The TypeScript twin below uses mlp.ts (float64) and is tested to reproduce those numbers.
 */
import { array, scalar, text } from '../trace/values';
import type { ExperimentDef, ReadoutItem, Trace, TraceStep, TraceValue } from '../types';
import { forward, lossAndGrads, sgdStep, type Network } from './mlp';
import { fmt } from './optimizers';
import record from './fixtures/tiny_net.json';
import rawSource from './fixtures/tiny_net.py?raw';

export const TORCH_SOURCE = rawSource.trimEnd();
export const TORCH_RECORD = record;

/** Initial parameters in PyTorch's layout: nn.Linear stores weight as (out_features, in_features). */
export const TORCH_INIT = {
  'hidden.weight': [
    [0.5, -0.3],
    [0.8, 0.2],
    [-0.4, 0.6],
  ],
  'hidden.bias': [0.1, -0.1, 0.0],
  'out.weight': [[0.7, -0.5, 0.3]],
  'out.bias': [0.05],
};

export const XOR_X = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
export const XOR_Y = [[0], [1], [1], [0]];
export const RECORDED = { lr: 0.5, steps: 3 };

export const transpose = (m: number[][]) => m[0]!.map((_, j) => m.map((row) => row[j]!));

/** The same parameters in mlp.ts's (in, out) layout: W = weightᵀ, so X @ W + b = X @ weight.T + bias. */
export function initialNetwork(): Network {
  return [
    { W: transpose(TORCH_INIT['hidden.weight']), b: [...TORCH_INIT['hidden.bias']], activation: 'tanh' },
    { W: transpose(TORCH_INIT['out.weight']), b: [...TORCH_INIT['out.bias']], activation: 'sigmoid' },
  ];
}

export interface TinyStep {
  step: number;
  yHat: number[][];
  loss: number;
  /** Gradients in PyTorch's layout, so they compare directly with param.grad. */
  grads: Record<string, number[][] | number[]>;
  /** Parameters after optimizer.step(), in PyTorch's layout. */
  after: Record<string, number[][] | number[]>;
}

export interface TinyRun {
  steps: TinyStep[];
  /** model(X) after training, one probability per row of X. */
  final: number[];
}

const torchLayout = (net: Network): Record<string, number[][] | number[]> => ({
  'hidden.weight': transpose(net[0]!.W),
  'hidden.bias': [...net[0]!.b],
  'out.weight': transpose(net[1]!.W),
  'out.bias': [...net[1]!.b],
});

/** optimizer.zero_grad(); y_hat = model(X); loss = BCE; loss.backward(); optimizer.step(), `steps` times. */
export function runTiny(lr: number, steps: number): TinyRun {
  let net = initialNetwork();
  const out: TinyStep[] = [];
  for (let step = 0; step < steps; step++) {
    const r = lossAndGrads(net, XOR_X, XOR_Y, 'bce');
    const grads = torchLayout(r.grads.map((g, l) => ({ ...net[l]!, W: g.dW, b: g.db })));
    net = sgdStep(net, r.grads, lr);
    out.push({ step, yHat: r.cache.A.at(-1)!, loss: r.loss, grads, after: torchLayout(net) });
  }
  return {
    steps: out,
    final: forward(net, XOR_X)
      .A.at(-1)!
      .map((row) => row[0]!),
  };
}

/** Largest |ours − PyTorch| over the recorded losses, gradients, parameters and final outputs. */
export function maxDifferenceFromTorch(run: TinyRun): number {
  let worst = 0;
  const cmp = (a: unknown, b: unknown): void => {
    if (Array.isArray(a) && Array.isArray(b)) a.forEach((x, i) => cmp(x, b[i]));
    else worst = Math.max(worst, Math.abs((a as number) - (b as number)));
  };
  record.steps.forEach((s, i) => {
    const ours = run.steps[i]!;
    cmp(ours.loss, s.loss);
    cmp(ours.yHat, s.y_hat);
    for (const name of Object.keys(TORCH_INIT)) {
      cmp(ours.grads[name], s.grads[name as keyof typeof s.grads]);
      cmp(ours.after[name], s.params_after[name as keyof typeof s.params_after]);
    }
  });
  cmp(run.final, record.final);
  return worst;
}

const LINE = {
  model: 16,
  hiddenW: 18,
  outB: 21,
  X: 23,
  y: 24,
  lossFn: 25,
  opt: 26,
  loop: 28,
  zero: 29,
  yHat: 30,
  loss: 31,
  backward: 32,
  step: 33,
  print: 34,
  final: 37,
};

const value = (v: number[][] | number[] | null): TraceValue => (v === null ? text('None') : array(v));

/**
 * The trace of tiny_net.py, built from the values recorded in tiny_net.json. It is labeled 'simulated':
 * the numbers come from a real PyTorch run, but nothing runs in the browser.
 */
export function buildTorchTrace(): Trace {
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const push = (line: number, note: string, set: TraceStep['vars'] = {}) => {
    Object.assign(vars, set);
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  const p0 = record.steps[0]!.params_before;
  push(
    LINE.model,
    'TinyNet() builds both nn.Linear layers with random weights; the next lines overwrite them so the run is reproducible.',
  );
  push(
    LINE.hiddenW,
    'hidden.weight has shape (3, 2): (out_features, in_features). Inside torch.no_grad(), copy_ is not recorded by autograd.',
    {
      'hidden.weight': array(p0['hidden.weight']),
    },
  );
  push(LINE.outB, 'All four parameter tensors are set: 2·3 + 3 + 3·1 + 1 = 13 numbers.', {
    'hidden.bias': array(p0['hidden.bias']),
    'out.weight': array(p0['out.weight']),
    'out.bias': array(p0['out.bias']),
  });
  push(LINE.X, 'X: the four XOR inputs, shape (4, 2), float32.', { X: array(XOR_X) });
  push(
    LINE.y,
    'y: the XOR labels as a column, shape (4, 1). BCELoss needs the same shape as the predictions.',
    { y: array(XOR_Y) },
  );
  push(LINE.opt, 'SGD with lr = 0.5 over model.parameters(): the four tensors above.');
  record.steps.forEach((s) => {
    push(LINE.loop, `step = ${s.step}.`, { step: scalar(s.step) });
    push(
      LINE.zero,
      s.step === 0
        ? 'No gradients yet: every .grad is None.'
        : 'zero_grad() resets every .grad to None (set_to_none=True is the default), so the previous step’s gradients are not added to the new ones.',
      {
        'hidden.weight.grad': text('None'),
        'out.weight.grad': text('None'),
      },
    );
    push(
      LINE.yHat,
      `model(X) calls forward: tanh(X @ hidden.weightᵀ + hidden.bias), then sigmoid of the output layer. y_hat has shape (4, 1).`,
      {
        y_hat: array(s.y_hat),
      },
    );
    push(LINE.loss, `Mean binary cross-entropy over the 4 rows: ${fmt(s.loss)}.`, { loss: scalar(s.loss) });
    push(
      LINE.backward,
      'backward() fills .grad of every parameter with ∂loss/∂parameter, each the same shape as its parameter.',
      {
        'hidden.weight.grad': value(s.grads['hidden.weight']),
        'out.weight.grad': value(s.grads['out.weight']),
      },
    );
    push(LINE.step, 'step() applies parameter −= 0.5 · parameter.grad to all four tensors.', {
      'hidden.weight': array(s.params_after['hidden.weight']),
      'hidden.bias': array(s.params_after['hidden.bias']),
      'out.weight': array(s.params_after['out.weight']),
      'out.bias': array(s.params_after['out.bias']),
    });
    push(LINE.print, `Prints ${s.step} ${Number(s.loss.toFixed(6))}.`, {
      output: text(record.printed.split('\n')[s.step]!),
    });
  });
  push(
    LINE.final,
    'After training, under no_grad (no graph is recorded), the four predictions, squeezed from (4, 1) to (4,).',
    {
      output: text(record.printed.trimEnd().split('\n').at(-1)!),
    },
  );
  return { source: 'simulated', steps };
}

export interface TinyState {
  lr: number;
  steps: number;
}

export const TINY_LR_CHOICES = [0.01, 0.05, 0.1, 0.5, 1, 2, 5];
export const MAX_TINY_STEPS = 300;

const isRecorded = (s: TinyState) => s.lr === RECORDED.lr && s.steps === RECORDED.steps;

/** The TypeScript twin of tiny_net.py, run live. */
export function tinyNetExperiment(id: string): ExperimentDef<TinyState, TinyRun> {
  return {
    id,
    initial: { ...RECORDED },
    controls: [
      {
        kind: 'slider',
        id: 'lr',
        label: 'Learning rate (lr)',
        min: 0,
        max: TINY_LR_CHOICES.length - 1,
        get: (s) => Math.max(0, TINY_LR_CHOICES.indexOf(s.lr)),
        set: (s, i) => ({ ...s, lr: TINY_LR_CHOICES[Math.round(i)]! }),
        format: (i) => String(TINY_LR_CHOICES[Math.round(i)]),
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Training steps',
        min: 1,
        max: MAX_TINY_STEPS,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps }),
      },
    ],
    compute: (s) => runTiny(s.lr, s.steps),
    readout: (s, r): ReadoutItem[] => {
      const shown = r.steps.slice(0, 3).map((st) => `${st.step} ${Number(st.loss.toFixed(6))}`);
      const items: ReadoutItem[] = [
        { label: 'Loss per step (first 3, rounded to 6 decimals)', value: shown.join(' · ') },
        { label: `Loss at step ${s.steps - 1}`, value: fmt(r.steps.at(-1)!.loss) },
        { label: 'model(X) after training', value: `[${r.final.map((p) => p.toFixed(4)).join(', ')}]` },
      ];
      items.push(
        isRecorded(s)
          ? {
              label: 'Compared with the recorded PyTorch run',
              value: `largest difference ${maxDifferenceFromTorch(r).toExponential(1)} (float32 vs float64)`,
            }
          : {
              label: 'Compared with the recorded PyTorch run',
              value: 'recorded only for lr = 0.5 and 3 steps',
            },
      );
      return items;
    },
  };
}
