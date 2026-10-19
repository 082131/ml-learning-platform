import { describe, expect, it } from 'vitest';
import { splitBars, splitFromX } from './barCompare';
import {
  autoSides,
  diagramBounds,
  layoutEdges,
  midpoint,
  portPoint,
  roundedPath,
  routeEdge,
  type FlowNode,
} from './flow';
import { arrowHead, shortenEnd } from './geometry';

const isOrthogonal = (pts: readonly (readonly [number, number])[]) =>
  pts.slice(1).every((p, i) => p[0] === pts[i]![0] || p[1] === pts[i]![1]);

describe('geometry', () => {
  it('builds an arrowhead with its tip on the target', () => {
    const [tip, left, right] = arrowHead([0, 0], [10, 0], 4)!;
    expect(tip).toEqual([10, 0]);
    expect(left).toEqual([6, 2]);
    expect(right).toEqual([6, -2]);
    expect(arrowHead([1, 1], [1, 1], 4)).toBeUndefined();
  });

  it('shortens a segment at its end', () => {
    expect(shortenEnd([0, 0], [10, 0], 4)).toEqual([6, 0]);
    expect(shortenEnd([0, 0], [3, 0], 4)).toEqual([0, 0]);
  });
});

describe('flow diagram layout', () => {
  const a: FlowNode = { id: 'a', label: 'A', x: 0, y: 0 };
  const b: FlowNode = { id: 'b', label: 'B', x: 200, y: 100 };
  const c: FlowNode = { id: 'c', label: 'C', x: 0, y: 200 };

  it('puts ports at the middle of each side', () => {
    expect(portPoint(a, 'right')).toEqual([140, 28]);
    expect(portPoint(a, 'bottom')).toEqual([70, 56]);
  });

  it('picks sides from relative positions', () => {
    expect(autoSides(a, b)).toEqual(['right', 'left']);
    expect(autoSides(b, a)).toEqual(['left', 'right']);
    expect(autoSides(a, c)).toEqual(['bottom', 'top']);
    expect(autoSides(c, a)).toEqual(['top', 'bottom']);
  });

  it('routes with horizontal and vertical segments only', () => {
    expect(routeEdge([140, 28], 'right', [200, 128], 'left')).toEqual([
      [140, 28],
      [170, 28],
      [170, 128],
      [200, 128],
    ]);
    expect(routeEdge([0, 0], 'right', [50, 0], 'left')).toEqual([
      [0, 0],
      [50, 0],
    ]);
    expect(routeEdge([0, 0], 'right', [50, 80], 'top')).toEqual([
      [0, 0],
      [50, 0],
      [50, 80],
    ]);
    for (const e of layoutEdges(
      [a, b, c],
      [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'c', to: 'b', fromSide: 'bottom', toSide: 'left' },
      ],
    ))
      expect(isOrthogonal(e.points)).toBe(true);
    expect(() => layoutEdges([a], [{ from: 'a', to: 'x' }])).toThrow(/doesn't exist/);
  });

  it('rounds corners and finds the midpoint by length', () => {
    expect(
      roundedPath(
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
        4,
      ),
    ).toBe('M0,0 L6,0 Q10,0 10,4 L10,10');
    expect(
      midpoint([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
    ).toEqual([10, 0]);
    expect(
      midpoint([
        [0, 0],
        [0, 8],
      ]),
    ).toEqual([0, 4]);
  });

  it('fits a viewBox around the nodes', () => {
    expect(diagramBounds([a, b], 10)).toEqual({ x: -10, y: -10, w: 360, h: 176 });
  });
});

describe('bar compare', () => {
  it('shows before values left of the split and after values from it on', () => {
    expect(splitBars([1, 2, 3], [4, 5, 6], 1)).toEqual([
      { value: 1, side: 'before' },
      { value: 5, side: 'after' },
      { value: 6, side: 'after' },
    ]);
    expect(() => splitBars([1], [1, 2], 0)).toThrow();
  });

  it('maps a pointer position to the nearest split', () => {
    expect(splitFromX(0, 100, 10)).toBe(0);
    expect(splitFromX(46, 100, 10)).toBe(5);
    expect(splitFromX(150, 100, 10)).toBe(10);
    expect(splitFromX(-5, 100, 10)).toBe(0);
  });
});
