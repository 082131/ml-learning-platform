import { arrowHead, pointsAttr, shortenEnd, type Point } from '@/lib/viz/geometry';
import { cx } from '@/components/ui';
import s from './svg.module.css';

export type Tone = 'accent' | 'ink' | 'muted' | 'err' | 'ok';

interface ArrowProps {
  from: Point;
  to: Point;
  tone?: Tone;
  dashed?: boolean;
  /** Arrowhead length in px. */
  size?: number;
  label?: string;
}

/** A straight arrow in screen coordinates. Its head is a polygon, so there are no shared marker ids. */
export function Arrow({ from, to, tone = 'accent', dashed, size = 10, label }: ArrowProps) {
  const head = arrowHead(from, to, size);
  const end = shortenEnd(from, to, size * 0.8);
  return (
    <g className={s[tone]}>
      <line
        className={cx(s.arrowLine, dashed && s.dashed)}
        x1={from[0]}
        y1={from[1]}
        x2={end[0]}
        y2={end[1]}
      />
      {head && <polygon points={pointsAttr(head)} stroke="none" />}
      {label && (
        <text className={s.label} x={to[0] + 6} y={to[1] - 6} stroke="none">
          {label}
        </text>
      )}
    </g>
  );
}
