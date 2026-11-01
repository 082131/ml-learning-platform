import type { ExperimentDef, ReadoutItem } from '../types';
import { MIB, pyFixed, pyThousands as n } from './format';

/**
 * Training step vs inference step for a small MLP (784 → hidden × layers → 10) in float32.
 * Everything is counted from the layer widths; the formulas are stated in TRAIN_INFER_SOURCE.
 */
export type OptimizerKind = 'sgd' | 'momentum' | 'adam';

export interface TrainInferState {
  hidden: number;
  layers: number;
  batch: number;
  optimizer: OptimizerKind;
}

export interface TrainInferResult {
  widths: number[];
  params: number;
  macs: number;
  weights: number;
  grads: number;
  optState: number;
  inferAct: number;
  trainAct: number;
  inferMemory: number;
  trainMemory: number;
  inferFlops: number;
  trainFlops: number;
}

/** Extra float32 numbers per parameter the optimizer keeps: momentum keeps 1, Adam keeps 2. */
export const OPT_BYTES: Record<OptimizerKind, number> = { sgd: 0, momentum: 4, adam: 8 };

export function trainVsInfer(s: TrainInferState): TrainInferResult {
  const widths = [784, ...Array<number>(s.layers).fill(s.hidden), 10];
  const pairs = widths.slice(0, -1).map((w, i) => [w, widths[i + 1]!] as const);
  const params = pairs.reduce((t, [i, o]) => t + i * o + o, 0);
  const macs = pairs.reduce((t, [i, o]) => t + i * o, 0);
  const weights = 4 * params;
  const grads = 4 * params;
  const optState = OPT_BYTES[s.optimizer] * params;
  const inferAct = 4 * s.batch * Math.max(...pairs.map(([i, o]) => i + o));
  const hiddenSum = widths.slice(1, -1).reduce((t, w) => t + w, 0);
  const trainAct = 4 * s.batch * (widths[0]! + 2 * hiddenSum + widths.at(-1)!);
  return {
    widths,
    params,
    macs,
    weights,
    grads,
    optState,
    inferAct,
    trainAct,
    inferMemory: weights + inferAct,
    trainMemory: weights + grads + optState + trainAct,
    inferFlops: 2 * macs * s.batch,
    trainFlops: 6 * macs * s.batch,
  };
}

export const TRAIN_INFER_SOURCE = `widths = [784] + [{{hidden}}] * {{layers}} + [10]   # input, hidden layers, 10 classes
batch, optimizer = {{batch}}, "{{optimizer}}"
pairs = list(zip(widths[:-1], widths[1:]))     # (inputs, outputs) of each layer

params = sum(i * o + o for i, o in pairs)      # weights and biases
macs = sum(i * o for i, o in pairs)            # multiply-adds per example

weights = 4 * params                           # float32: 4 bytes per number
grads = 4 * params                             # training only: one gradient per weight
opt_state = {"sgd": 0, "momentum": 4, "adam": 8}[optimizer] * params
infer_act = 4 * batch * max(i + o for i, o in pairs)
train_act = 4 * batch * (widths[0] + 2 * sum(widths[1:-1]) + widths[-1])

MiB = 2 ** 20
print(f"parameters        {params:,}")
print(f"inference memory  {(weights + infer_act) / MiB:9.2f} MiB")
print(f"training memory   {(weights + grads + opt_state + train_act) / MiB:9.2f} MiB")
print(f"inference FLOPs   {2 * macs * batch:,}")
print(f"training FLOPs    {6 * macs * batch:,}")`;

export const trainInferSlots = (s: TrainInferState): Record<string, string> => ({
  hidden: String(s.hidden),
  layers: String(s.layers),
  batch: String(s.batch),
  optimizer: s.optimizer,
});

const mib = (b: number) => pyFixed(b / MIB, 2).padStart(9, ' ');

export function trainInferPrintout(r: TrainInferResult): string[] {
  return [
    `parameters        ${n(r.params)}`,
    `inference memory  ${mib(r.inferMemory)} MiB`,
    `training memory   ${mib(r.trainMemory)} MiB`,
    `inference FLOPs   ${n(r.inferFlops)}`,
    `training FLOPs    ${n(r.trainFlops)}`,
  ];
}

export function trainInferReadout(s: TrainInferState, r: TrainInferResult): ReadoutItem[] {
  return [
    { label: 'What the code prints', value: trainInferPrintout(r).join('\n') },
    {
      label: 'Training ÷ inference',
      value: `memory ${pyFixed(r.trainMemory / r.inferMemory, 1)}×, arithmetic 3.0× (6 vs 2 FLOPs per weight per example)`,
    },
    {
      label: 'Parameter share of inference memory',
      value: `${pyFixed((100 * r.weights) / r.inferMemory, 1)}% weights, ${pyFixed((100 * r.inferAct) / r.inferMemory, 1)}% activations at batch ${s.batch}`,
    },
  ];
}

export function trainInferExperiment(
  id: string,
  initial: TrainInferState,
): ExperimentDef<TrainInferState, TrainInferResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'hidden',
        label: 'Hidden width',
        min: 64,
        max: 4096,
        step: 64,
        get: (s) => s.hidden,
        set: (s, v) => ({ ...s, hidden: v }),
      },
      {
        kind: 'slider',
        id: 'layers',
        label: 'Hidden layers',
        min: 1,
        max: 8,
        get: (s) => s.layers,
        set: (s, v) => ({ ...s, layers: v }),
      },
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size',
        min: 1,
        max: 1024,
        get: (s) => s.batch,
        set: (s, v) => ({ ...s, batch: v }),
      },
      {
        kind: 'select',
        id: 'optimizer',
        label: 'Optimizer (training only)',
        options: [
          { value: 'sgd', label: 'SGD (no extra state)' },
          { value: 'momentum', label: 'SGD with momentum (1 number per weight)' },
          { value: 'adam', label: 'Adam (2 numbers per weight)' },
        ],
        get: (s) => s.optimizer,
        set: (s, v) => ({ ...s, optimizer: v as OptimizerKind }),
      },
    ],
    compute: trainVsInfer,
    readout: trainInferReadout,
  };
}
