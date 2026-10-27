import { useId, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { DOMAIN, type TrainResult, type TrainState } from '@/lib/deep/trainingExperiment';
import { fmt } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Marker } from '../OptimizerRace/Marker';
import svg from '../svg/svg.module.css';
import s from './TrainingRun.module.css';

const MAX_HEIGHT = 420;
const POINT = 4;
const PHONE_POINT = 2.5;
const NARROW = 500;

/** The trained network's decision boundary over the data (inside an Experiment made with trainingExperiment). */
export function TrainingBoundary() {
  const { state, result } = useExperimentContext<TrainState, TrainResult>('TrainingBoundary');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const d = DOMAIN[state.dataset];
  const m = DEFAULT_MARGIN;
  const aspect = (d.y[1] - d.y[0]) / (d.x[1] - d.x[0]);
  const height = Math.min(MAX_HEIGHT, Math.round((width - m.left - m.right) * aspect) + m.top + m.bottom);
  const x = scaleLinear()
    .domain(d.x)
    .range([m.left, width - m.right]);
  const y = scaleLinear()
    .domain(d.y)
    .range([height - m.bottom, m.top]);
  const clipId = useId().replace(/:/g, '');
  const { grid, boundary, data, run } = result;
  const last = run.epochs.at(-1)!;
  const cw = x(grid.xs[1]!) - x(grid.xs[0]!);
  const ch = y(grid.ys[0]!) - y(grid.ys[1]!);
  const points = (set: 'train' | 'val') =>
    data[set].X.map((p, i) => {
      const cls = data[set].y[i]![0]!;
      return (
        <g key={`${set}${i}`} className={cls === 1 ? svg.accent : svg.ink} opacity={set === 'val' ? 0.55 : 1}>
          <Marker shape={cls === 1 ? 'square' : 'circle'} x={x(p[0]!)} y={y(p[1]!)} size={width < NARROW ? PHONE_POINT : POINT} />
        </g>
      );
    });

  return (
    <VizFrame
      title="Decision boundary"
      caption={`After ${state.epochs} epoch${state.epochs === 1 ? '' : 's'}: the shaded region is where the network predicts class 1 (p ≥ 0.5), and the line is p = 0.5. Accuracy ${Math.round(last.trainAcc * 100)}% on the 100 training points (solid) and ${Math.round(last.valAcc * 100)}% on the 50 validation points (faded).`}
      table={
        <VizTable
          caption="Accuracy and loss"
          columns={['Data', 'Points', 'Loss', 'Accuracy']}
          rows={[
            ['Training', data.train.X.length, fmt(last.trainLoss), `${Math.round(last.trainAcc * 100)}%`],
            ['Validation', data.val.X.length, fmt(last.valLoss), `${Math.round(last.valAcc * 100)}%`],
          ]}
        />
      }
    >
      <div ref={ref} className={s.chart} data-boundary-segments={boundary.length}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Training data and the network's decision boundary"
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
          <g aria-hidden="true" clipPath={`url(#${clipId})`}>
            {grid.values.flatMap((row, j) =>
              row.map((p, i) =>
                p >= 0.5 ? (
                  <rect
                    key={`${i},${j}`}
                    className={s.region}
                    x={x(grid.xs[i]!) - cw / 2}
                    y={y(grid.ys[j]!) - ch / 2}
                    width={cw + 0.5}
                    height={ch + 0.5}
                  />
                ) : null,
              ),
            )}
            <path
              className={s.boundary}
              d={boundary.map(([a, b]) => `M${x(a[0])},${y(a[1])}L${x(b[0])},${y(b[1])}`).join('')}
            />
            {points('val')}
            {points('train')}
          </g>
          <Axes x={x} y={y} xLabel="x₁" yLabel="x₂" format={fmt} />
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        <li>
          <svg width="12" height="12" aria-hidden="true" className={svg.ink}>
            <Marker shape="circle" x={6} y={6} size={4} />
          </svg>
          Class 0
        </li>
        <li>
          <svg width="12" height="12" aria-hidden="true" className={svg.accent}>
            <Marker shape="square" x={6} y={6} size={4} />
          </svg>
          Class 1
        </li>
        <li>
          <span className={s.swatch} aria-hidden="true" /> Predicted class 1
        </li>
      </ul>
    </VizFrame>
  );
}
