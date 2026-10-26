import { useId, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import {
  B_DOMAIN,
  BEST,
  CONTOUR_LEVELS,
  gradientAt,
  levelSet,
  W_DOMAIN,
  type Descent2DState,
  type Run2D,
} from '@/lib/optimization/descent2d';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Arrow } from '../svg/Arrow';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './DescentContour.module.css';

const FALLBACK_WIDTH = 640;
const MAX_PLOT_HEIGHT = 440;
const FIELD = 8;
const FIELD_LEN = 16;

/**
 * Gradient descent on the loss surface of a two-parameter model, seen from above: contour lines of
 * equal loss, a field of small arrows pointing along −∇L, and the path the updates take. Use inside an
 * Experiment made with descent2DExperiment.
 */
export function DescentContour() {
  const { state, result } = useExperimentContext<Descent2DState, Run2D>('DescentContour');
  const ref = useRef<HTMLDivElement>(null);
  const clip = useId();
  const available = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  // One scale for both axes, so −∇L really crosses the contours at right angles on screen.
  const span = (d: [number, number]) => d[1] - d[0];
  const unit = Math.min((available - m.left - m.right) / span(W_DOMAIN), MAX_PLOT_HEIGHT / span(B_DOMAIN));
  const width = Math.round(unit * span(W_DOMAIN) + m.left + m.right);
  const height = Math.round(unit * span(B_DOMAIN) + m.top + m.bottom);
  const x = scaleLinear()
    .domain(W_DOMAIN)
    .range([m.left, width - m.right]);
  const y = scaleLinear()
    .domain(B_DOMAIN)
    .range([height - m.bottom, m.top]);
  const toPath = line<[number, number]>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]));
  const inspect = Math.min(state.inspect, result.steps.length - 1);
  const step = result.steps[inspect]!;
  const next = result.path[inspect + 1]!;
  const inView = (p: readonly number[]) =>
    p.every(Number.isFinite) &&
    p[0]! >= W_DOMAIN[0] &&
    p[0]! <= W_DOMAIN[1] &&
    p[1]! >= B_DOMAIN[0] &&
    p[1]! <= B_DOMAIN[1];
  const visible = result.path.filter((p) => p.every((v) => Math.abs(v) < 1e6));

  const field: { from: [number, number]; to: [number, number] }[] = [];
  for (let i = 0; i < FIELD; i++)
    for (let j = 0; j < FIELD; j++) {
      const w = W_DOMAIN[0] + ((i + 0.5) * (W_DOMAIN[1] - W_DOMAIN[0])) / FIELD;
      const b = B_DOMAIN[0] + ((j + 0.5) * (B_DOMAIN[1] - B_DOMAIN[0])) / FIELD;
      const [dw, db] = gradientAt(w, b);
      // Screen direction of −∇L (the y axis points down on screen).
      const sx = -dw * (x(1) - x(0));
      const sy = -db * (y(1) - y(0));
      const len = Math.hypot(sx, sy);
      if (len === 0) continue;
      const from: [number, number] = [x(w), y(b)];
      field.push({ from, to: [from[0] + (sx / len) * FIELD_LEN, from[1] + (sy / len) * FIELD_LEN] });
    }

  return (
    <VizFrame
      title="Loss surface from above"
      badge={result.status === 'up' ? 'loss went up' : undefined}
      table={
        <VizTable
          caption="Each update: the point before it, its loss and its gradient"
          columns={['Step', 'w', 'b', 'Loss', '∂L/∂w', '∂L/∂b']}
          rows={result.steps.map((st) => [
            st.k + 1,
            formatNumber(st.w),
            formatNumber(st.b),
            formatNumber(st.loss),
            formatNumber(st.dw),
            formatNumber(st.db),
          ])}
        />
      }
      caption={`Contours of equal loss at ${CONTOUR_LEVELS.join(', ')}; the minimum is at w = ${BEST.w}, b = ${BEST.b}. Small arrows point along −∇L, which crosses each contour at a right angle. Step ${inspect + 1} goes from (${formatNumber(step.w)}, ${formatNumber(step.b)}) to (${formatNumber(next[0])}, ${formatNumber(next[1])}).`}
    >
      <div ref={ref} className={s.wrap} data-descent-status={result.status}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Contour map of the loss over w and b with the descent path"
        >
          <defs>
            <clipPath id={clip}>
              <rect
                x={m.left}
                y={m.top}
                width={width - m.left - m.right}
                height={height - m.top - m.bottom}
              />
            </clipPath>
          </defs>
          <Axes x={x} y={y} xLabel="weight w" yLabel="bias b" />
          <g clipPath={`url(#${clip})`}>
            {CONTOUR_LEVELS.map((level) => (
              <path key={level} className={s.contour} d={toPath(levelSet(level)) ?? ''} data-level={level} />
            ))}
            <g className={s.field} aria-hidden="true">
              {field.map((f) => (
                <Arrow key={`${f.from[0]},${f.from[1]}`} from={f.from} to={f.to} tone="muted" size={5} />
              ))}
            </g>
            <path className={`${svg.line} ${svg.accent} ${s.path}`} d={toPath(visible) ?? ''} />
            {visible.map((p, k) => (
              <circle key={k} className={svg.accent} cx={x(p[0])} cy={y(p[1])} r={k === 0 ? 5 : 2.5} />
            ))}
            {inView([step.w, step.b]) && inView(next) && (
              <g data-inspected-step={inspect}>
                <Arrow from={[x(step.w), y(step.b)]} to={[x(next[0]), y(next[1])]} tone="err" size={9} />
              </g>
            )}
            <g className={svg.ink}>
              <path
                d={`M${x(BEST.w) - 6},${y(BEST.b)}h12M${x(BEST.w)},${y(BEST.b) - 6}v12`}
                strokeWidth={2.5}
              />
              <text className={svg.label} x={x(BEST.w) + 8} y={y(BEST.b) + 16} stroke="none">
                minimum
              </text>
            </g>
          </g>
        </svg>
      </div>
    </VizFrame>
  );
}
