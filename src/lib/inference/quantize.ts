import { roundHalfEven } from './floatBits';

export type Scheme = 'symmetric' | 'asymmetric';
export type Granularity = 'tensor' | 'channel';

export interface QuantParams {
  scale: number;
  zeroPoint: number;
}

/** The integer range for `bits`: symmetric uses ±(2^(b−1) − 1), asymmetric the full −2^(b−1)…2^(b−1) − 1. */
export function intRange(bits: number, scheme: Scheme) {
  const qmax = 2 ** (bits - 1) - 1;
  return { qmin: scheme === 'symmetric' ? -qmax : -(2 ** (bits - 1)), qmax };
}

const clip = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Scale and zero point for a group of values (a whole tensor or one channel).
 * Symmetric: scale = max|w| / qmax, zero point 0. Asymmetric: the range [min(w, 0), max(w, 0)] is
 * spread over all 2^b integers and the zero point is the integer that represents 0.
 */
export function quantParams(values: readonly number[], bits: number, scheme: Scheme): QuantParams {
  const { qmin, qmax } = intRange(bits, scheme);
  if (scheme === 'symmetric') {
    const maxAbs = Math.max(...values.map(Math.abs));
    return { scale: maxAbs === 0 ? 1 : maxAbs / qmax, zeroPoint: 0 };
  }
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const scale = hi === lo ? 1 : (hi - lo) / (qmax - qmin);
  return { scale, zeroPoint: clip(roundHalfEven(qmin - lo / scale), qmin, qmax) };
}

/** q = clip(round(w / scale) + zero_point, qmin, qmax). */
export const quantizeValue = (w: number, p: QuantParams, bits: number, scheme: Scheme) => {
  const { qmin, qmax } = intRange(bits, scheme);
  return clip(roundHalfEven(w / p.scale) + p.zeroPoint, qmin, qmax);
};

/** w ≈ (q − zero_point) · scale. */
export const dequantizeValue = (q: number, p: QuantParams) => (q - p.zeroPoint) * p.scale;

export interface QuantizedMatrix {
  /** One entry per row for per-channel, a single entry for per-tensor. */
  params: QuantParams[];
  q: number[][];
  dequantized: number[][];
}

/** Quantizes and dequantizes a (rows, cols) matrix; per-channel means one scale per row (output channel). */
export function quantizeMatrix(
  W: readonly (readonly number[])[],
  bits: number,
  scheme: Scheme,
  granularity: Granularity,
): QuantizedMatrix {
  const params =
    granularity === 'tensor' ? [quantParams(W.flat(), bits, scheme)] : W.map((row) => quantParams(row, bits, scheme));
  const paramsOf = (i: number) => params[granularity === 'tensor' ? 0 : i]!;
  const q = W.map((row, i) => row.map((w) => quantizeValue(w, paramsOf(i), bits, scheme)));
  return { params, q, dequantized: q.map((row, i) => row.map((v) => dequantizeValue(v, paramsOf(i)))) };
}

export interface ErrorStats {
  count: number;
  maxAbs: number;
  mse: number;
  /** Signal-to-quantization-noise ratio in decibels: 10·log10(Σw² / Σerror²). */
  sqnrDb: number;
}

export function errorStats(original: readonly number[], approx: readonly number[]): ErrorStats {
  let signal = 0;
  let noise = 0;
  let maxAbs = 0;
  original.forEach((w, i) => {
    const e = approx[i]! - w;
    signal += w * w;
    noise += e * e;
    maxAbs = Math.max(maxAbs, Math.abs(e));
  });
  return {
    count: original.length,
    maxAbs,
    mse: noise / original.length,
    sqnrDb: noise === 0 ? Infinity : 10 * Math.log10(signal / noise),
  };
}

export interface Histogram {
  /** Bin edges, bins.length + 1 values. */
  edges: number[];
  counts: number[];
}

/** Counts values in `bins` equal-width bins over [−limit, limit]. Values on the upper edge go in the last bin. */
export function histogram(values: readonly number[], limit: number, bins: number): Histogram {
  const width = (2 * limit) / bins;
  const counts = Array<number>(bins).fill(0);
  for (const v of values) counts[clip(Math.floor((v + limit) / width), 0, bins - 1)]! += 1;
  return { edges: Array.from({ length: bins + 1 }, (_, i) => -limit + i * width), counts };
}
