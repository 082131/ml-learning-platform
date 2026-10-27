import { useId, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import {
  inspectedStep,
  surfaceContours,
  type RaceResult,
  type RaceState,
} from '@/lib/deep/optimizerExperiment';
import { fmt, fmtVec, OPTIMIZER_IDS, OPTIMIZER_LABEL, surfaceOf, type Vec2 } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Marker } from './Marker';
import { RACE_STYLE } from './raceStyle';
import svg from '../svg/svg.module.css';
import s from './OptimizerRace.module.css';

const ASPECT = 0.62;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 440;

/** The race on a contour plot of the loss surface (inside an Experiment made with optimizerRaceExperiment). */
export function OptimizerRace() {
  const { state, result } = useExperimentContext<RaceState, RaceResult>('OptimizerRace');
  const surface = surfaceOf(state.surface);
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, width * ASPECT)));
  const clipId = useId().replace(/:/g, '');
  const m = DEFAULT_MARGIN;
  const x = scaleLinear()
    .domain(surface.x)
    .range([m.left, width - m.right]);
  const y = scaleLinear()
    .domain(surface.y)
    .range([height - m.bottom, m.top]);
  const contours = surfaceContours(surface);
  const path = line<Vec2>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]));
  const t = state.inspect;
  const diverged = OPTIMIZER_IDS.filter((id) => result[id].status === 'diverged');

  const caption = `${surface.formula}, minimum at ${fmtVec(surface.minimum)}, start ${fmtVec(surface.start)}. Contour lines join points of equal loss (levels ${surface.levels.join(', ')}). Rings mark θ before step ${t}.`;
  const table = (
    <VizTable
      caption="Where each optimizer is"
      columns={[
        'Optimizer',
        `θ before step ${t}`,
        `End after ${state.steps} steps`,
        'f at the end',
        'Status',
      ]}
      rows={OPTIMIZER_IDS.map((id) => {
        const run = result[id];
        const end = run.path.at(-1)!;
        return [
          OPTIMIZER_LABEL[id],
          fmtVec(inspectedStep(run, t).theta),
          fmtVec(end),
          fmt(surface.f(...end)),
          run.status === 'diverged' ? `diverged at step ${run.divergedAt}` : 'ok',
        ];
      })}
    />
  );

  return (
    <VizFrame title="Optimizer race" caption={caption} table={table}>
      <div ref={ref} className={s.chart} data-race-surface={surface.id}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Paths of three optimizers on ${surface.formula}`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={m.left}
                y={m.top}
                width={width - m.left - m.right}
                height={height - m.top - m.bottom}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`} aria-hidden="true">
            {contours.map(({ level, segments }) => (
              <path
                key={level}
                className={s.contour}
                d={segments.map(([a, b]) => `M${x(a[0])},${y(a[1])}L${x(b[0])},${y(b[1])}`).join('')}
              />
            ))}
            {OPTIMIZER_IDS.map((id) => {
              const st = RACE_STYLE[id];
              const run = result[id];
              const at = inspectedStep(run, t).theta;
              const end = run.path.at(-1)!;
              return (
                <g key={id} className={svg[st.tone]} data-path={id} data-status={run.status}>
                  <path className={svg.line} d={path(run.path) ?? ''} strokeDasharray={st.dash} />
                  <circle cx={x(at[0])} cy={y(at[1])} r={8} fill="none" strokeWidth={2} />
                  <Marker shape={st.marker} x={x(end[0])} y={y(end[1])} />
                </g>
              );
            })}
            <g className={svg.ink}>
              <path
                d={`M${x(surface.minimum[0]) - 6},${y(surface.minimum[1])}h12M${x(surface.minimum[0])},${y(surface.minimum[1]) - 6}v12`}
                strokeWidth={2}
              />
              <text
                className={svg.label}
                x={x(surface.minimum[0]) + 6}
                y={y(surface.minimum[1]) + 20}
                stroke="none"
              >
                min
              </text>
              <text
                className={svg.label}
                x={x(surface.start[0]) + 8}
                y={y(surface.start[1]) + 16}
                stroke="none"
              >
                start
              </text>
            </g>
          </g>
          <Axes x={x} y={y} xLabel="x" yLabel="y" format={fmt} />
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        {OPTIMIZER_IDS.map((id) => {
          const st = RACE_STYLE[id];
          return (
            <li key={id}>
              <svg width="34" height="12" aria-hidden="true" className={svg[st.tone]}>
                <line className={svg.line} x1="0" x2="24" y1="6" y2="6" strokeDasharray={st.dash} />
                <Marker shape={st.marker} x={29} y={6} size={4} />
              </svg>
              {OPTIMIZER_LABEL[id]}
            </li>
          );
        })}
      </ul>
      {diverged.length > 0 && (
        <p className={s.diverged} role="status" data-diverged={diverged.join(' ')}>
          {diverged.map((id) => (
            <span key={id}>
              <strong>{RACE_STYLE[id].short} diverged</strong> at step {result[id].divergedAt}: each step
              overshot the valley floor by more than the last, until the values left the safe range (|value|
              &gt; 1e6). Its path stops there.{' '}
            </span>
          ))}
        </p>
      )}
    </VizFrame>
  );
}
