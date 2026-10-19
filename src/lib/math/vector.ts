import { ShapeError } from './matrix';

export type Vector = readonly number[];

function assertSameLength(a: Vector, b: Vector, op: string) {
  if (a.length !== b.length)
    throw new ShapeError(`Can't ${op} vectors of length ${a.length} and ${b.length}: lengths must match.`);
}

export function add(a: Vector, b: Vector): number[] {
  assertSameLength(a, b, 'add');
  return a.map((x, i) => x + b[i]!);
}

export function subtract(a: Vector, b: Vector): number[] {
  assertSameLength(a, b, 'subtract');
  return a.map((x, i) => x - b[i]!);
}

export function scale(a: Vector, k: number): number[] {
  return a.map((x) => x * k);
}

/** Sum of the pairwise products: a·b = a₀b₀ + a₁b₁ + … */
export function dot(a: Vector, b: Vector): number {
  assertSameLength(a, b, 'take the dot product of');
  return a.reduce((sum, x, i) => sum + x * b[i]!, 0);
}

/** Euclidean length ‖a‖ = √(a·a). */
export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a));
}

/** cos θ = a·b / (‖a‖‖b‖). Undefined (NaN) when either vector has length 0. */
export function cosine(a: Vector, b: Vector): number {
  const denom = norm(a) * norm(b);
  return denom === 0 ? NaN : dot(a, b) / denom;
}

/** The angle between two vectors in degrees, in [0, 180]. NaN when either has length 0. */
export function angleDegrees(a: Vector, b: Vector): number {
  const c = cosine(a, b);
  // Clamp: rounding can push |cos θ| slightly above 1, where acos returns NaN.
  return Number.isNaN(c) ? NaN : (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI;
}
