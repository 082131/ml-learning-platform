/** Contour lines (isolines) of a 2-D function by marching squares, for loss-surface and decision-boundary plots. */

export type Point2 = readonly [number, number];
export type Segment = readonly [Point2, Point2];

/** f sampled on a regular grid: values[j][i] = f(xs[i], ys[j]). */
export interface SampledGrid {
  xs: number[];
  ys: number[];
  values: number[][];
}

const linspace = ([a, b]: readonly [number, number], n: number) =>
  Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Samples f at nx × ny points spanning the two domains (both ends included). */
export function sampleGrid(
  f: (x: number, y: number) => number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  nx: number,
  ny: number,
): SampledGrid {
  if (nx < 2 || ny < 2) throw new Error('A grid needs at least 2 points in each direction');
  const xs = linspace(xDomain, nx);
  const ys = linspace(yDomain, ny);
  return { xs, ys, values: ys.map((y) => xs.map((x) => f(x, y))) };
}

/** Where the line from p (value a) to q (value b) crosses `level`, by linear interpolation. */
function cross(p: Point2, q: Point2, a: number, b: number, level: number): Point2 {
  const t = a === b ? 0.5 : (level - a) / (b - a);
  return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
}

/**
 * The segments of the curve f = level, one or two per grid cell that the curve passes through.
 * A corner counts as "above" when its value is ≥ level. Saddle cells (two opposite corners above)
 * are resolved with the cell's center value, the mean of its four corners.
 */
export function isolines(grid: SampledGrid, level: number): Segment[] {
  const { xs, ys, values } = grid;
  const out: Segment[] = [];
  for (let j = 0; j < ys.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const p00: Point2 = [xs[i]!, ys[j]!];
      const p10: Point2 = [xs[i + 1]!, ys[j]!];
      const p01: Point2 = [xs[i]!, ys[j + 1]!];
      const p11: Point2 = [xs[i + 1]!, ys[j + 1]!];
      const v00 = values[j]![i]!;
      const v10 = values[j]![i + 1]!;
      const v01 = values[j + 1]![i]!;
      const v11 = values[j + 1]![i + 1]!;
      if (![v00, v10, v01, v11].every(Number.isFinite)) continue;
      const up = (v: number) => v >= level;
      const edges = {
        bottom: up(v00) !== up(v10) ? cross(p00, p10, v00, v10, level) : undefined,
        right: up(v10) !== up(v11) ? cross(p10, p11, v10, v11, level) : undefined,
        top: up(v01) !== up(v11) ? cross(p01, p11, v01, v11, level) : undefined,
        left: up(v00) !== up(v01) ? cross(p00, p01, v00, v01, level) : undefined,
      };
      const hits = Object.values(edges).filter((p): p is Point2 => p !== undefined);
      if (hits.length === 2) out.push([hits[0]!, hits[1]!]);
      else if (hits.length === 4) {
        const centerUp = up((v00 + v10 + v01 + v11) / 4);
        // With 00 and 11 above: a center above joins them, so the curve cuts off corners 10 and 01.
        const cutTen = up(v00) === centerUp;
        if (cutTen) {
          out.push([edges.bottom!, edges.right!]);
          out.push([edges.top!, edges.left!]);
        } else {
          out.push([edges.bottom!, edges.left!]);
          out.push([edges.right!, edges.top!]);
        }
      }
    }
  return out;
}
