import type { ExperimentDef, ReadoutItem } from '../types';
import { countCorrect, type DigitsModel } from './digitsModel';
import { pyFixed, pyThousands } from './format';
import {
  errorStats,
  quantizeMatrix,
  type ErrorStats,
  type Granularity,
  type QuantizedMatrix,
  type Scheme,
} from './quantize';

export interface QuantState {
  scheme: Scheme;
  granularity: Granularity;
  bits: number;
}

export interface QuantResult {
  layers: [QuantizedMatrix, QuantizedMatrix];
  /** Dequantized minus original, W1 then W2, row by row. */
  errors: number[];
  stats: ErrorStats;
  correct: number;
  floatCorrect: number;
  testSize: number;
  bytes: { float32: number; quantized: number; scales: number };
}

export const MIN_BITS = 2;
export const MAX_BITS = 8;
const FLOAT32_BYTES = 4;

/** Quantizes both weight matrices, measures the error, and runs the quantized model on the test images. */
export function runQuantization(m: DigitsModel, s: QuantState): QuantResult {
  const layers = [m.W1, m.W2].map((W) => quantizeMatrix(W, s.bits, s.scheme, s.granularity)) as [
    QuantizedMatrix,
    QuantizedMatrix,
  ];
  const original = [...m.W1.flat(), ...m.W2.flat()];
  const approx = layers.flatMap((l) => l.dequantized.flat());
  const scales = layers.reduce((n, l) => n + l.params.length, 0);
  // A scale is stored as a float32; an asymmetric zero point takes one integer of the same width as q.
  const perGroup = FLOAT32_BYTES + (s.scheme === 'asymmetric' ? 1 : 0);
  return {
    layers,
    errors: approx.map((v, i) => v - original[i]!),
    stats: errorStats(original, approx),
    correct: countCorrect(m, layers[0].dequantized, layers[1].dequantized),
    floatCorrect: m.floatCorrect,
    testSize: m.test.y.length,
    bytes: {
      float32: original.length * FLOAT32_BYTES,
      quantized: (original.length * s.bits) / 8,
      scales: scales * perGroup,
    },
  };
}

/** Correct test images for each bit width, for both granularities (the accuracy chart). */
export function accuracyByBits(m: DigitsModel, scheme: Scheme) {
  const bits = Array.from({ length: MAX_BITS - MIN_BITS + 1 }, (_, i) => MIN_BITS + i);
  return (['tensor', 'channel'] as const).map((granularity) => ({
    granularity,
    points: bits.map((b) => [b, runQuantization(m, { scheme, granularity, bits: b }).correct] as const),
  }));
}

/** Python's `f"{x:.3e}"`: two-digit exponent with a sign. */
export function pyExp(x: number, digits: number): string {
  const [mant, exp] = x.toExponential(digits).split('e') as [string, string];
  const sign = exp.startsWith('-') ? '-' : '+';
  return `${mant}e${sign}${exp.replace(/^[+-]/, '').padStart(2, '0')}`;
}

export const QUANT_SOURCE = `import json
import numpy as np

def quantize_symmetric(w, bits, axis):
    qmax = 2 ** (bits - 1) - 1
    scale = np.abs(w).max(axis=axis, keepdims=True) / qmax
    q = np.clip(np.round(w / scale), -qmax, qmax)
    return q * scale

def quantize_asymmetric(w, bits, axis):
    qmin, qmax = -2 ** (bits - 1), 2 ** (bits - 1) - 1
    lo = np.minimum(w.min(axis=axis, keepdims=True), 0)
    hi = np.maximum(w.max(axis=axis, keepdims=True), 0)
    scale = (hi - lo) / (qmax - qmin)
    zero_point = np.clip(np.round(qmin - lo / scale), qmin, qmax)
    q = np.clip(np.round(w / scale) + zero_point, qmin, qmax)
    return (q - zero_point) * scale

model = json.load(open("digits_mlp.json"))
W1, W2 = np.array(model["W1"]), np.array(model["W2"])    # (16, 64) and (10, 16)
W1_hat = quantize_{{scheme}}(W1, bits={{bits}}, axis={{axis}})
W2_hat = quantize_{{scheme}}(W2, bits={{bits}}, axis={{axis}})

err = np.concatenate([(W1_hat - W1).ravel(), (W2_hat - W2).ravel()])
print(f"max |error|: {np.abs(err).max():.6f}")
print(f"MSE:         {np.mean(err ** 2):.3e}")

X = np.array(model["test"]["X"]) / 16                      # (360, 64)
h = np.maximum(0, X @ W1_hat.T + model["b1"])               # (360, 16)
pred = (h @ W2_hat.T + model["b2"]).argmax(axis=1)          # (360,)
print(f"accuracy:    {np.mean(pred == model['test']['y']):.1%}")`;

export const quantSlots = (s: QuantState): Record<string, string> => ({
  scheme: s.scheme,
  bits: String(s.bits),
  axis: s.granularity === 'tensor' ? 'None' : '1',
});

/** Exactly what QUANT_SOURCE prints (checked against CPython and NumPy in quantize.test.ts). */
export const quantPrintout = (r: QuantResult) => [
  `max |error|: ${pyFixed(r.stats.maxAbs, 6)}`,
  `MSE:         ${pyExp(r.stats.mse, 3)}`,
  `accuracy:    ${pyFixed((100 * r.correct) / r.testSize, 1)}%`,
];

export function quantReadout(r: QuantResult): ReadoutItem[] {
  const total = r.bytes.quantized + r.bytes.scales;
  return [
    { label: 'Python: what the code prints', value: quantPrintout(r).join('\n') },
    {
      label: 'Test images correct',
      value: `${r.correct} of ${r.testSize} (float32 model: ${r.floatCorrect})`,
    },
    {
      label: 'Weight storage',
      value: `${pyThousands(total)} bytes vs ${pyThousands(r.bytes.float32)} in float32 (${pyFixed(r.bytes.float32 / total, 1)}× smaller)`,
    },
    { label: 'SQNR', value: `${pyFixed(r.stats.sqnrDb, 1)} dB` },
  ];
}

export interface QuantLabResult extends QuantResult {
  byBits: ReturnType<typeof accuracyByBits>;
}

export function quantizationExperiment(
  id: string,
  model: DigitsModel,
  initial: QuantState,
): ExperimentDef<QuantState, QuantLabResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'bits',
        label: 'Bits per weight',
        min: MIN_BITS,
        max: MAX_BITS,
        get: (s) => s.bits,
        set: (s, bits) => ({ ...s, bits }),
      },
      {
        kind: 'select',
        id: 'scheme',
        label: 'Scheme',
        options: [
          { value: 'symmetric', label: 'Symmetric (zero point 0)' },
          { value: 'asymmetric', label: 'Asymmetric (scale and zero point)' },
        ],
        get: (s) => s.scheme,
        set: (s, v) => ({ ...s, scheme: v as Scheme }),
      },
      {
        kind: 'select',
        id: 'granularity',
        label: 'Scale per',
        options: [
          { value: 'tensor', label: 'Tensor (one scale per matrix)' },
          { value: 'channel', label: 'Channel (one scale per output row)' },
        ],
        get: (s) => s.granularity,
        set: (s, v) => ({ ...s, granularity: v as Granularity }),
      },
    ],
    compute: (s) => ({ ...runQuantization(model, s), byBits: accuracyByBits(model, s.scheme) }),
    readout: (_, r) => quantReadout(r),
  };
}
