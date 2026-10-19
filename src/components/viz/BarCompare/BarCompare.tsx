import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { scaleLinear } from 'd3-scale';
import { splitBars, splitFromX } from '@/lib/viz/barCompare';
import { formatNumber } from '@/lib/trace/values';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './BarCompare.module.css';

interface Side {
  label: string;
  values: number[];
}

export interface BarCompareProps {
  title: string;
  /** Shown left of the handle (muted), for example FP32. */
  before: Side;
  /** Shown from the handle on (accent), for example INT8. */
  after: Side;
  /** Names of the bars, one per value. Defaults to 1, 2, 3… */
  categories?: string[];
  categoryLabel: string;
  valueLabel: string;
  initialSplit?: number;
  caption?: ReactNode;
  badge?: ReactNode;
}

const HEIGHT = 220;
const PAD_TOP = 28;
const FALLBACK_WIDTH = 640;

/**
 * Before/after bars with a draggable split (reference 02): bars left of the handle show the
 * "before" values, the rest show "after". The handle is a keyboard slider too.
 */
export function BarCompare({
  title,
  before,
  after,
  categories,
  categoryLabel,
  valueLabel,
  initialSplit,
  caption,
  badge,
}: BarCompareProps) {
  const count = before.values.length;
  const [split, setSplit] = useState(initialSplit ?? Math.floor(count / 2));
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const dragging = useRef(false);
  const bars = splitBars(before.values, after.values, split);
  const max = Math.max(0, ...before.values, ...after.values);
  const y = scaleLinear()
    .domain([0, max || 1])
    .range([HEIGHT, PAD_TOP]);
  const bw = width / Math.max(count, 1);
  const names = categories ?? before.values.map((_, i) => String(i + 1));
  const hx = split * bw;

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    setSplit(splitFromX(e.clientX - e.currentTarget.getBoundingClientRect().left, width, count));
  };
  const onKey = (e: KeyboardEvent) => {
    const next = { ArrowLeft: split - 1, ArrowRight: split + 1, Home: 0, End: count }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setSplit(Math.max(0, Math.min(count, next)));
  };

  return (
    <VizFrame
      title={title}
      caption={caption}
      badge={badge}
      table={
        <VizTable
          caption={title}
          columns={[categoryLabel, `${before.label} (${valueLabel})`, `${after.label} (${valueLabel})`]}
          rows={names.map((n, i) => [n, formatNumber(before.values[i]!), formatNumber(after.values[i]!)])}
        />
      }
    >
      <div ref={ref} className={s.wrap}>
        <svg
          width={width}
          height={HEIGHT + 1}
          className={s.svg}
          role="img"
          aria-label={`${valueLabel} by ${categoryLabel}: ${before.label} for the first ${split}, ${after.label} for the other ${count - split}`}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            move(e);
          }}
          onPointerMove={move}
          onPointerUp={() => (dragging.current = false)}
        >
          {bars.map((b, i) => (
            <rect
              key={i}
              className={b.side === 'before' ? s.before : s.after}
              x={i * bw + bw * 0.15}
              width={Math.max(1, bw * 0.7)}
              y={y(b.value)}
              height={HEIGHT - y(b.value)}
            />
          ))}
          <line className={s.handleLine} x1={hx} x2={hx} y1={0} y2={HEIGHT} />
        </svg>
        <div
          className={s.handle}
          style={{ left: hx }}
          role="slider"
          tabIndex={0}
          aria-label={`Split between ${before.label} and ${after.label}`}
          aria-valuemin={0}
          aria-valuemax={count}
          aria-valuenow={split}
          aria-valuetext={`${split} bars show ${before.label}, ${count - split} show ${after.label}`}
          onKeyDown={onKey}
        >
          {split > 0 && <span className={s.tag}>{before.label} ‹</span>}
          <span className={s.grip} aria-hidden="true" />
          {split < count && <span className={s.tag}>› {after.label}</span>}
        </div>
      </div>
      <p className={s.axis}>
        {categoryLabel} → · height: {valueLabel}
      </p>
    </VizFrame>
  );
}
