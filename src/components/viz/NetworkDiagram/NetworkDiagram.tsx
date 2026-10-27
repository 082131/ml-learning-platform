import { useRef } from 'react';
import { along, edgeSegment, edgeWidth, layoutNetwork, NODE_RADIUS } from '@/lib/deep/networkLayout';
import { arrowHead, pointsAttr } from '@/lib/viz/geometry';
import { Button, cx } from '@/components/ui';
import { useElementWidth } from '../VizFrame/useElementWidth';
import svg from '../svg/svg.module.css';
import s from './NetworkDiagram.module.css';

export interface DiagramUnit {
  /** Shown inside the circle, for example "h[0]". */
  label: string;
  /** First line under the circle, for example the activation value. */
  value?: string;
  /** Second line under the circle, for example a gradient. */
  sub?: string;
}
export interface DiagramLayer {
  name: string;
  units: DiagramUnit[];
}
export interface DiagramEdge {
  /** The layer the edge enters (1 for edges from layer 0 to layer 1). */
  layer: number;
  from: number;
  to: number;
  weight: number;
  label?: string;
  active?: boolean;
}

export interface NetworkDiagramProps {
  layers: DiagramLayer[];
  edges: DiagramEdge[];
  /** One sentence naming what the picture shows, for screen readers. */
  label: string;
  selected?: { layer: number; unit?: number };
  /** Units to emphasize, as "layer:unit". */
  activeUnits?: string[];
  /** Direction of the arrowheads drawn on active edges. */
  flow?: 'forward' | 'backward';
}

const FALLBACK_WIDTH = 560;
const MAX_WIDTH = 640;
/** Below this width per layer the labels collide, so the diagram scrolls sideways instead of shrinking. */
const MIN_COLUMN = 135;
const LABEL_AT = 0.66;
const LABEL_CHAR = 7.4;
const HEAD = 9;

/**
 * A layered network: one column per layer, an edge per weight (thicker for larger |w|, dashed when
 * negative), values under each unit. Presentational: experiment views pass in what to show.
 */
export function NetworkDiagram({
  layers,
  edges,
  label,
  selected,
  activeUnits = [],
  flow,
}: NetworkDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sizes = layers.map((l) => l.units.length);
  const width = Math.max(
    Math.min(useElementWidth(ref, FALLBACK_WIDTH), MAX_WIDTH),
    sizes.length * MIN_COLUMN,
  );
  const { nodes, height } = layoutNetwork(sizes, width);
  const maxAbs = Math.max(...edges.map((e) => Math.abs(e.weight)), 1e-9);
  const isActive = (l: number, i: number) => activeUnits.includes(`${l}:${i}`);

  return (
    <div ref={ref} className={s.wrap}>
      <svg width={width} height={height + NODE_RADIUS} role="img" aria-label={label} className={s.svg}>
        {edges.map((e) => {
          const [a, b] = edgeSegment(nodes[e.layer - 1]![e.from]!, nodes[e.layer]![e.to]!);
          const head =
            e.active && flow
              ? flow === 'forward'
                ? arrowHead(a, b, HEAD)
                : arrowHead(b, a, HEAD)
              : undefined;
          return (
            <g
              key={`${e.layer}:${e.from}:${e.to}`}
              className={e.active ? svg.accent : svg.muted}
              data-edge={`${e.layer}:${e.from}:${e.to}`}
            >
              <line
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                className={cx(e.weight < 0 && svg.dashed)}
                strokeWidth={edgeWidth(e.weight, maxAbs)}
                opacity={e.active || !edges.some((x) => x.active) ? 1 : 0.45}
              />
              {head && <polygon points={pointsAttr(head)} stroke="none" />}
            </g>
          );
        })}
        {edges
          .filter((e) => e.label)
          .map((e) => {
            const [a, b] = edgeSegment(nodes[e.layer - 1]![e.from]!, nodes[e.layer]![e.to]!);
            const [x, y] = along(a, b, LABEL_AT);
            const w = e.label!.length * LABEL_CHAR + 8;
            return (
              <g key={`label-${e.layer}:${e.from}:${e.to}`}>
                <rect x={x - w / 2} y={y - 10} width={w} height={18} className={s.labelBox} />
                <text x={x} y={y + 3} textAnchor="middle" className={svg.label}>
                  {e.label}
                </text>
              </g>
            );
          })}
        {layers.map((layer, l) =>
          layer.units.map((u, i) => {
            const [x, y] = nodes[l]![i]!;
            const chosen = selected?.layer === l && (selected.unit === undefined || selected.unit === i);
            return (
              <g key={`${l}:${i}`} data-unit={`${l}:${i}`} data-selected={chosen || undefined}>
                {chosen && <circle cx={x} cy={y} r={NODE_RADIUS + 5} className={s.ring} />}
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS}
                  className={cx(s.node, (chosen || isActive(l, i)) && s.nodeActive)}
                />
                <text x={x} y={y + 4} textAnchor="middle" className={svg.label}>
                  {u.label}
                </text>
                {u.value && (
                  <text x={x} y={y + NODE_RADIUS + 16} textAnchor="middle" className={cx(svg.label, s.value)}>
                    {u.value}
                  </text>
                )}
                {u.sub && (
                  <text x={x} y={y + NODE_RADIUS + 32} textAnchor="middle" className={cx(svg.tick, s.sub)}>
                    {u.sub}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}

/** A row of toggle buttons (one pressed). The pressed one is filled and has a square bullet, not just a color. */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.choice} role="group" aria-label={label}>
      <span className={s.choiceLabel} aria-hidden="true">
        {label}
      </span>
      {options.map((o) => (
        <Button
          key={String(o.value)}
          size="sm"
          variant={o.value === value ? 'primary' : 'secondary'}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
