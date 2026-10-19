/** Beyond this magnitude an iterative computation (gradient descent, for example) counts as diverged. */
export const DIVERGENCE_LIMIT = 1e6;

export type NumericStatus = 'finite' | 'diverged';

/**
 * Classifies a number for display (spec edge case: extreme slider values). NaN, ±Infinity and
 * anything larger in magnitude than `limit` is 'diverged', so callers can label it instead of plotting it.
 */
export function isFiniteOrDiverged(x: number, limit = DIVERGENCE_LIMIT): NumericStatus {
  return Number.isFinite(x) && Math.abs(x) <= limit ? 'finite' : 'diverged';
}

/** True when every value is finite and within `limit`. */
export function allFinite(values: readonly number[], limit = DIVERGENCE_LIMIT): boolean {
  return values.every((x) => isFiniteOrDiverged(x, limit) === 'finite');
}

/** Rounds away floating-point noise such as 0.1 + 0.2 = 0.30000000000000004, for display and comparison. */
export function roundTo(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}

/** Clamps x into [min, max]. */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Rounds x to the nearest multiple of `step`, for example to snap a dragged point to a 0.5 grid. */
export function snap(x: number, step: number): number {
  return roundTo(Math.round(x / step) * step, 10);
}
