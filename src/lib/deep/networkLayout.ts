import type { Point } from '../viz/geometry';

/** Geometry for a layered network diagram: one column per layer, units spread evenly in each column. */
export interface NetworkLayout {
  width: number;
  height: number;
  /** nodes[l][i]: the center of unit i in layer l. */
  nodes: Point[][];
}

export const NODE_RADIUS = 22;
/** Vertical room per unit: the circle plus a value line under it. */
export const UNIT_SPACING = 96;
const MARGIN_X = 48;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;

/**
 * Columns are spaced evenly across `width`; each column is centered vertically, so a 2-3-1
 * network has its single output unit level with the middle hidden unit.
 */
export function layoutNetwork(sizes: readonly number[], width: number): NetworkLayout {
  const tallest = Math.max(...sizes);
  const height = MARGIN_TOP + MARGIN_BOTTOM + (tallest - 1) * UNIT_SPACING;
  const span = Math.max(width - 2 * MARGIN_X, 0);
  const step = sizes.length > 1 ? span / (sizes.length - 1) : 0;
  const nodes = sizes.map((count, l) => {
    const x = sizes.length > 1 ? MARGIN_X + l * step : width / 2;
    const top = MARGIN_TOP + ((tallest - count) * UNIT_SPACING) / 2;
    return Array.from({ length: count }, (_, i) => [x, top + i * UNIT_SPACING] as Point);
  });
  return { width, height, nodes };
}

/** A point a fraction t of the way from a to b. */
export const along = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** The segment between two unit circles, trimmed so it starts and ends at their edges. */
export function edgeSegment(a: Point, b: Point, r = NODE_RADIUS): [Point, Point] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len <= 2 * r) return [a, b];
  return [along(a, b, r / len), along(a, b, 1 - r / len)];
}

const MIN_STROKE = 0.75;
const MAX_STROKE = 6;

/** Stroke width for a weight: proportional to |w| relative to the largest |w| shown, within bounds. */
export function edgeWidth(w: number, maxAbs: number): number {
  if (!(maxAbs > 0) || !Number.isFinite(w)) return MIN_STROKE;
  return MIN_STROKE + (MAX_STROKE - MIN_STROKE) * Math.min(1, Math.abs(w) / maxAbs);
}
