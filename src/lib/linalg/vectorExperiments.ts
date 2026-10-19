import { add, angleDegrees, cosine, dot, norm, scale } from '../math/vector';
import { formatNumber } from '../trace/values';
import type { ExperimentDef, ReadoutItem } from '../types';
import { numpyVector, pyListLiteral, pyLiteral, pyRepr } from './pyFormat';

export type Vec2 = [number, number];

/** VectorPlane can snap a dragged coordinate to −0; Python has no −0 literal, so fold it to 0. */
export const plain = (v: readonly number[]): Vec2 => [v[0]! + 0, v[1]! + 0];

/** NumPy picks the dtype from the literal: any non-whole number makes a float array. */
export const isFloatArray = (v: readonly number[]) => v.some((x) => !Number.isInteger(x));

const paren = (x: number) => (x < 0 ? `(${formatNumber(x)})` : formatNumber(x));

export interface VectorBasicsState {
  u: Vec2;
  v: Vec2;
  /** The scalar k in k·u. */
  k: number;
}
export interface VectorBasicsResult {
  sum: number[];
  scaled: number[];
}

export const SCALE_LIMITS = { min: -2, max: 2, step: 0.5 } as const;

/** u + v and k·u, result first so a narrow readout cell still shows it: "(4, 3) = (3 + 1, 1 + 2)". */
export function describeSum(u: readonly number[], v: readonly number[]) {
  const s = add(u, v);
  return `(${s.map(formatNumber).join(', ')}) = (${u.map((x, i) => `${formatNumber(x)} + ${paren(v[i]!)}`).join(', ')})`;
}
export function describeScale(k: number, u: readonly number[]) {
  const s = scale(u, k);
  return `(${s.map((x) => formatNumber(x + 0)).join(', ')}) = (${u.map((x) => `${paren(k)}·${paren(x)}`).join(', ')})`;
}

/**
 * Two draggable vectors and a scalar for the scalars-vectors lesson. The readout prints exactly what
 * `print(u + v)` and `print(k * u)` print in NumPy for the current literals (dtype included).
 */
export function vectorBasicsExperiment(id: string, initial: VectorBasicsState): ExperimentDef<
  VectorBasicsState,
  VectorBasicsResult
> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'k',
        label: 'Scalar k',
        ...SCALE_LIMITS,
        get: (s) => s.k,
        set: (s, k) => ({ ...s, k }),
        format: formatNumber,
      },
    ],
    compute: (s) => {
      const [u, v] = [plain(s.u), plain(s.v)];
      return { sum: add(u, v), scaled: scale(u, s.k) };
    },
    readout: (s, r) => {
      const [u, v] = [plain(s.u), plain(s.v)];
      const kFloat = !Number.isInteger(s.k);
      const items: ReadoutItem[] = [
        { label: 'u + v', value: describeSum(u, v) },
        { label: 'k·u', value: describeScale(s.k, u) },
        { label: 'print(u + v)', value: numpyVector(r.sum, isFloatArray(u) || isFloatArray(v)) },
        { label: 'print(k * u)', value: numpyVector(r.scaled, kFloat || isFloatArray(u)) },
      ];
      return items;
    },
  };
}

/** Slot values for the NumPy code beside the plane. */
export const vectorSlots = {
  u: (s: unknown) => pyListLiteral(plain((s as VectorBasicsState).u)),
  v: (s: unknown) => pyListLiteral(plain((s as VectorBasicsState).v)),
  k: (s: unknown) => pyLiteral((s as VectorBasicsState).k),
};

export interface DotState {
  u: Vec2;
  v: Vec2;
}
export interface DotResult {
  dot: number;
  normU: number;
  normV: number;
  /** NaN when either vector is (0, 0). */
  cos: number;
  angle: number;
}

/** The dot product, lengths, cos θ and θ of two vectors, computed in the order the lesson's code uses. */
export function dotProductResult(u: readonly number[], v: readonly number[]): DotResult {
  const d = dot(u, v);
  const normU = norm(u);
  const normV = norm(v);
  return { dot: d, normU, normV, cos: cosine(u, v), angle: angleDegrees(u, v) };
}

/** "5 = 3·1 + 1·2 = 3 + 2", result first. */
export function describeDot(u: readonly number[], v: readonly number[]) {
  const products = u.map((x, i) => x * v[i]! + 0);
  return `${formatNumber(dot(u, v) + 0)} = ${u.map((x, i) => `${paren(x)}·${paren(v[i]!)}`).join(' + ')} = ${products.map(paren).join(' + ')}`;
}

/** The scalar print() shows for np.dot of two arrays: an integer for int arrays, repr otherwise. */
export function printDot(u: readonly number[], v: readonly number[], d: number) {
  return isFloatArray(u) || isFloatArray(v) ? pyRepr(d) : String(d + 0);
}

/** Two draggable vectors for the dot-product lesson. Readout values match the lesson's NumPy code. */
export function dotProductExperiment(id: string, initial: DotState): ExperimentDef<DotState, DotResult> {
  return {
    id,
    initial,
    controls: [],
    compute: (s) => dotProductResult(plain(s.u), plain(s.v)),
    readout: (s, r) => {
      const [u, v] = [plain(s.u), plain(s.v)];
      const zero = Number.isNaN(r.cos);
      return [
        { label: 'u · v', value: describeDot(u, v) },
        { label: '‖u‖', value: `${formatNumber(r.normU)} ≈ √${formatNumber(dot(u, u))}` },
        { label: '‖v‖', value: `${formatNumber(r.normV)} ≈ √${formatNumber(dot(v, v))}` },
        zero
          ? { label: 'cos θ', value: 'undefined: a vector of length 0 has no direction', status: 'error' }
          : {
              label: 'cos θ',
              value: `${formatNumber(r.cos)} ≈ ${formatNumber(r.dot + 0)} / (${formatNumber(r.normU)} × ${formatNumber(r.normV)})`,
            },
        ...(zero ? [] : [{ label: 'θ', value: `${formatNumber(r.angle)}°` }]),
        { label: 'print(d)', value: printDot(u, v, r.dot) },
        {
          label: 'print(cos)',
          value: zero ? 'nan (NumPy also warns: invalid value encountered in scalar divide)' : pyRepr(r.cos),
        },
      ];
    },
  };
}

export const dotSlots = {
  u: (s: unknown) => pyListLiteral(plain((s as DotState).u)),
  v: (s: unknown) => pyListLiteral(plain((s as DotState).v)),
};
