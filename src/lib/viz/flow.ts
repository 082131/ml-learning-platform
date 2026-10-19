import type { Point } from './geometry';

export type Side = 'left' | 'right' | 'top' | 'bottom';
export type NodeStatus = 'idle' | 'active' | 'ok' | 'warn' | 'error' | 'unknown';

export interface FlowNode {
  id: string;
  label: string;
  /** Top-left corner and size in diagram units (the SVG viewBox). */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Detail line under the label, for example a shape such as "(B, 768)". */
  detail?: string;
  status?: NodeStatus;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** Sides to leave and enter from. Chosen from the node positions when left out. */
  fromSide?: Side;
  toSide?: Side;
  label?: string;
  /** A junction marker at the middle of the route, as in the reference diagram. */
  junction?: 'square' | 'round';
  active?: boolean;
}

export const NODE_W = 140;
export const NODE_H = 56;

export const sizeOf = (n: FlowNode) => ({ w: n.w ?? NODE_W, h: n.h ?? NODE_H });

/** The middle of one side of a node. */
export function portPoint(n: FlowNode, side: Side): Point {
  const { w, h } = sizeOf(n);
  switch (side) {
    case 'left':
      return [n.x, n.y + h / 2];
    case 'right':
      return [n.x + w, n.y + h / 2];
    case 'top':
      return [n.x + w / 2, n.y];
    case 'bottom':
      return [n.x + w / 2, n.y + h];
  }
}

/** Left-to-right when the target starts right of the source, otherwise top-to-bottom (or the reverse). */
export function autoSides(a: FlowNode, b: FlowNode): [Side, Side] {
  const { w, h } = sizeOf(a);
  if (b.x >= a.x + w) return ['right', 'left'];
  if (b.x + sizeOf(b).w <= a.x) return ['left', 'right'];
  return b.y >= a.y + h ? ['bottom', 'top'] : ['top', 'bottom'];
}

const horizontal = (s: Side) => s === 'left' || s === 'right';

/**
 * An orthogonal route (only horizontal and vertical segments) from one port to another.
 * Opposite sides bend at the midpoint; perpendicular sides make one corner.
 */
export function routeEdge(from: Point, fromSide: Side, to: Point, toSide: Side): Point[] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  if (horizontal(fromSide) && horizontal(toSide)) {
    if (y1 === y2) return [from, to];
    const mx = (x1 + x2) / 2;
    return [from, [mx, y1], [mx, y2], to];
  }
  if (!horizontal(fromSide) && !horizontal(toSide)) {
    if (x1 === x2) return [from, to];
    const my = (y1 + y2) / 2;
    return [from, [x1, my], [x2, my], to];
  }
  return horizontal(fromSide) ? [from, [x2, y1], to] : [from, [x1, y2], to];
}

/** An SVG path through orthogonal points with rounded corners of radius `r` (clamped to fit). */
export function roundedPath(points: readonly Point[], r: number): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M${first![0]},${first![1]}`;
  for (let i = 0; i < rest.length; i++) {
    const prev = points[i]!;
    const cur = rest[i]!;
    const next = rest[i + 1];
    if (!next) {
      d += ` L${cur[0]},${cur[1]}`;
      break;
    }
    const inLen = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const outLen = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const a: Point = [cur[0] - Math.sign(cur[0] - prev[0]) * rr, cur[1] - Math.sign(cur[1] - prev[1]) * rr];
    const b: Point = [cur[0] + Math.sign(next[0] - cur[0]) * rr, cur[1] + Math.sign(next[1] - cur[1]) * rr];
    d += ` L${a[0]},${a[1]} Q${cur[0]},${cur[1]} ${b[0]},${b[1]}`;
  }
  return d;
}

/** The point halfway along a polyline, measured by length. */
export function midpoint(points: readonly Point[]): Point {
  const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i]![0], p[1] - points[i]![1]));
  let remaining = segs.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < segs.length; i++) {
    const len = segs[i]!;
    if (remaining <= len && len > 0) {
      const t = remaining / len;
      const [a, b] = [points[i]!, points[i + 1]!];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= len;
  }
  return points[0] ?? [0, 0];
}

export interface RoutedEdge extends FlowEdge {
  points: Point[];
}

/** Routes every edge. Throws on an edge that names a node that doesn't exist. */
export function layoutEdges(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): RoutedEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) throw new Error(`Edge ${e.from} → ${e.to} names a node that doesn't exist`);
    const [auto1, auto2] = autoSides(a, b);
    const s1 = e.fromSide ?? auto1;
    const s2 = e.toSide ?? auto2;
    return { ...e, points: routeEdge(portPoint(a, s1), s1, portPoint(b, s2), s2) };
  });
}

/** The smallest viewBox that holds every node, plus a margin. */
export function diagramBounds(nodes: readonly FlowNode[], margin: number) {
  const right = Math.max(...nodes.map((n) => n.x + sizeOf(n).w));
  const bottom = Math.max(...nodes.map((n) => n.y + sizeOf(n).h));
  const left = Math.min(...nodes.map((n) => n.x));
  const top = Math.min(...nodes.map((n) => n.y));
  return { x: left - margin, y: top - margin, w: right - left + 2 * margin, h: bottom - top + 2 * margin };
}
