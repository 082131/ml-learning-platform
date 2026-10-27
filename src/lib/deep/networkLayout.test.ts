import { describe, expect, it } from 'vitest';
import { along, edgeSegment, edgeWidth, layoutNetwork, NODE_RADIUS, UNIT_SPACING } from './networkLayout';

describe('layoutNetwork', () => {
  it('spaces a 2-3-1 network in three columns, each centered vertically', () => {
    const { nodes, height } = layoutNetwork([2, 3, 1], 496);
    // Columns at 48, 248, 448 (width 496 minus two 48px margins, split in two gaps of 200).
    expect(nodes.map((col) => col[0]![0])).toEqual([48, 248, 448]);
    // The tallest layer (3 units) spans 2 gaps of 96px; height = 40 + 40 + 192 = 272.
    expect(height).toBe(272);
    expect(nodes[1]!.map((p) => p[1])).toEqual([40, 136, 232]);
    // 2 units sit half a gap lower than the top: 40 + 48 = 88 and 184. The single output is level with the middle.
    expect(nodes[0]!.map((p) => p[1])).toEqual([88, 184]);
    expect(nodes[2]![0]![1]).toBe(136);
    expect(nodes[1]![1]![1]! - nodes[1]![0]![1]!).toBe(UNIT_SPACING);
  });
});

describe('edge helpers', () => {
  it('trims edges to the circle edges', () => {
    const [a, b] = edgeSegment([0, 0], [100, 0]);
    expect(a).toEqual([NODE_RADIUS, 0]);
    expect(b).toEqual([100 - NODE_RADIUS, 0]);
    expect(along([0, 0], [10, 20], 0.25)).toEqual([2.5, 5]);
  });
  it('scales stroke width with |w|', () => {
    expect(edgeWidth(0, 2)).toBe(0.75);
    expect(edgeWidth(-2, 2)).toBe(6);
    expect(edgeWidth(1, 2)).toBeCloseTo(3.375, 10);
    expect(edgeWidth(5, 0)).toBe(0.75);
  });
});
