import { sigmoid } from '@/lib/classical/logistic';
import { formatP, type LogResult, type LogState } from '@/lib/classical/logisticExperiment';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type XY } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';
import s from './LogisticCurves.module.css';

const Z_RANGE = 10;
const SAMPLES = 40;
const CURVE: XY[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const z = -Z_RANGE + (2 * Z_RANGE * i) / SAMPLES;
  return [z, sigmoid(z)];
});

/** The sigmoid with the selected penguin's (z, p) marked, and the training log loss per step. */
export function LogisticCurves() {
  const { state, result } = useExperimentContext<LogState, LogResult>('LogisticCurves');
  const { z, p } = result.sel;
  const zShown = Math.max(-Z_RANGE, Math.min(Z_RANGE, z));
  const history = result.run.history;
  return (
    <div className={s.layout} data-logistic-curves>
      <LineChart
        title="The sigmoid function"
        xLabel="score z"
        yLabel="p"
        xDomain={[-Z_RANGE, Z_RANGE]}
        yDomain={[0, 1]}
        series={[{ id: 'sigmoid', label: 'σ(z) = 1 / (1 + e^(−z))', points: CURVE, inTable: false }]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            <g className={svg.muted}>
              <line
                className={`${svg.line} ${svg.dashed}`}
                x1={x(-Z_RANGE)}
                x2={x(Z_RANGE)}
                y1={y(0.5)}
                y2={y(0.5)}
              />
            </g>
            <g className={svg.err} data-sigmoid-point>
              <line
                x1={x(zShown)}
                x2={x(zShown)}
                y1={y(0)}
                y2={y(p)}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle cx={x(zShown)} cy={y(p)} r={6} fill="none" strokeWidth={2.5} />
            </g>
          </g>
        )}
        caption={`Penguin ${state.sel + 1}: z = ${formatNumber(z)}, so p = σ(z) = ${formatP(p)}${Math.abs(z) > Z_RANGE ? ` (z is off the chart; the circle sits at the edge)` : ''}. The dashed line is p = 0.5, reached at z = 0.`}
      />
      <LineChart
        title="Training log loss per step"
        xLabel="step"
        yLabel="log loss"
        yDomain={[0, 0.7]}
        series={[
          {
            id: 'loss',
            label: 'log loss',
            points: history.map((h) => [h.step, h.loss] as const),
            dots: history.length <= 60,
          },
        ]}
        caption={`Starts at log 2 = ${formatNumber(Math.log(2))} (every p = 0.5) and is ${formatNumber(history.at(-1)!.loss)} after ${history.length - 1} steps.`}
      />
    </div>
  );
}
