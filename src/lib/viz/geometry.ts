export type Point = readonly [number, number];

/**
 * The three corners of an arrowhead whose tip sits at `to`, pointing along from → to.
 * Returns undefined for a zero-length arrow, which has no direction.
 */
export function arrowHead(from: Point, to: Point, size: number): [Point, Point, Point] | undefined {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return undefined;
  const ux = dx / len;
  const uy = dy / len;
  const back: Point = [to[0] - ux * size, to[1] - uy * size];
  const half = size / 2;
  return [to, [back[0] - uy * half, back[1] + ux * half], [back[0] + uy * half, back[1] - ux * half]];
}

/** Shortens a segment at its end by `by`, so a stroked line stops where an arrowhead begins. */
export function shortenEnd(from: Point, to: Point, by: number): Point {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (len <= by) return from;
  const t = (len - by) / len;
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

export const pointsAttr = (pts: readonly Point[]) => pts.map((p) => p.join(',')).join(' ');
