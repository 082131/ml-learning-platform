import { useMemo, useRef, type ReactNode } from 'react';
import { arrowHead, pointsAttr, type Point } from '@/lib/viz/geometry';
import {
  diagramBounds,
  layoutEdges,
  midpoint,
  roundedPath,
  sizeOf,
  type FlowEdge,
  type FlowNode,
  type NodeStatus,
} from '@/lib/viz/flow';
import { cx } from '@/components/ui';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FlowDiagram.module.css';

export interface FlowDiagramProps {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Makes nodes buttons, for example to show a stage's code. */
  onSelect?: (id: string) => void;
  selected?: string;
  caption?: ReactNode;
  badge?: ReactNode;
}

/** Status badges carry a glyph and a word, never color alone. */
export const STATUS: Record<NodeStatus, { glyph: string; word: string }> = {
  idle: { glyph: '', word: 'idle' },
  active: { glyph: '●', word: 'running' },
  ok: { glyph: '✓', word: 'ok' },
  warn: { glyph: '!', word: 'warning' },
  error: { glyph: '✗', word: 'failed' },
  unknown: { glyph: '?', word: 'unknown' },
};

const MARGIN = 16;
const CORNER = 10;
const HEAD = 9;
/** Below this scale the diagram scrolls sideways instead of shrinking further. */
const MIN_SCALE = 0.7;

/** Nodes and orthogonal connectors with arrowheads and junction markers (reference 03). */
export function FlowDiagram({ title, nodes, edges, onSelect, selected, caption, badge }: FlowDiagramProps) {
  const routed = useMemo(() => layoutEdges(nodes, edges), [nodes, edges]);
  const b = diagramBounds(nodes, MARGIN);
  const ref = useRef<HTMLDivElement>(null);
  const available = useElementWidth(ref, b.w);
  const width = Math.max(Math.min(available, b.w), b.w * MIN_SCALE);
  const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <VizFrame
      title={title}
      caption={caption}
      badge={badge}
      table={
        <VizTable
          caption={title}
          columns={['From', 'To', 'Note']}
          rows={edges.map((e) => [label(e.from), label(e.to), e.label ?? ''])}
        />
      }
    >
      <div ref={ref} className={s.wrap}>
        <svg
          width={width}
          height={(b.h * width) / b.w}
          viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
          role="group"
          aria-label={title}
        >
          {routed.map((e, i) => {
            const last = e.points.at(-1)!;
            const head = arrowHead(e.points.at(-2)!, last, HEAD);
            const mid = midpoint(e.points);
            return (
              <g key={i} className={cx(s.edge, e.active && s.active)} data-edge={`${e.from}-${e.to}`}>
                <path d={roundedPath(trimEnd(e.points, HEAD * 0.8), CORNER)} />
                {head && <polygon className={s.head} points={pointsAttr(head)} />}
                {e.junction === 'square' && (
                  <rect className={s.head} x={mid[0] - 4} y={mid[1] - 4} width={8} height={8} />
                )}
                {e.junction === 'round' && <circle className={s.head} cx={mid[0]} cy={mid[1]} r={4.5} />}
                {e.label && (
                  <text className={s.edgeLabel} x={mid[0]} y={mid[1] - 8} textAnchor="middle">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((n) => (
            <Node key={n.id} node={n} selected={selected === n.id} onSelect={onSelect} />
          ))}
        </svg>
      </div>
    </VizFrame>
  );
}

function trimEnd(points: Point[], by: number): Point[] {
  const a = points.at(-2)!;
  const z = points.at(-1)!;
  const len = Math.hypot(z[0] - a[0], z[1] - a[1]);
  const t = len > by ? (len - by) / len : 0;
  return [...points.slice(0, -1), [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t]];
}

function Node({
  node: n,
  selected,
  onSelect,
}: {
  node: FlowNode;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const { w, h } = sizeOf(n);
  const status = n.status ?? 'idle';
  const { glyph, word } = STATUS[status];
  const interactive = !!onSelect;
  const name = [n.label, n.detail, status !== 'idle' && word].filter(Boolean).join(', ');
  return (
    <g
      className={cx(s.node, s[status], selected && s.selected, interactive && s.interactive)}
      transform={`translate(${n.x},${n.y})`}
      data-node={n.id}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={() => onSelect?.(n.id)}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(n.id);
        }
      }}
    >
      {/* An SVG <title> names the node (and shows as a tooltip); it includes the status in words. */}
      <title>{name}</title>
      <rect className={s.box} width={w} height={h} rx={8} />
      <text
        className={s.nodeLabel}
        x={w / 2}
        y={n.detail ? h / 2 - 4 : h / 2}
        dy="0.32em"
        textAnchor="middle"
      >
        {n.label}
      </text>
      {n.detail && (
        <text className={s.detail} x={w / 2} y={h / 2 + 13} dy="0.32em" textAnchor="middle">
          {n.detail}
        </text>
      )}
      {glyph && (
        <g transform={`translate(${w},0)`} aria-hidden="true">
          <circle className={s.badge} r={11} />
          <text className={s.badgeText} dy="0.35em" textAnchor="middle">
            {glyph}
          </text>
        </g>
      )}
    </g>
  );
}
