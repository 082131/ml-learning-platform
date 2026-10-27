import type { GDLinResult, GDLinState } from '@/lib/classical/linearRegressionExperiment';
import type { GDPoint } from '@/lib/classical/linearRegression';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type XY } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';
import s from './RegressionGD.module.css';

const SLOPE: [number, number] = [-0.1, 0.6];
const INTERCEPT: [number, number] = [-6, 1];
const LOSS: [number, number] = [0, 0.5];
const inside = ([a, b]: [number, number], v: number) => v >= a && v <= b;
const paren = (v: number) => (v < 0 ? `(${formatNumber(v)})` : formatNumber(v));

/** The update that produced `p` from `prev`, written with the code's variable names. */
function describeUpdate(prev: GDPoint, p: GDPoint, lr: number, shift: number) {
  const bCode = (q: GDPoint) => q.intercept + q.slope * shift;
  return [
    `grad_w = ${formatNumber(p.grad!.w)}, grad_b = ${formatNumber(p.grad!.b)}`,
    `w = ${formatNumber(prev.slope)} − ${lr} × ${paren(p.grad!.w)} = ${formatNumber(p.slope)}`,
    `b = ${formatNumber(bCode(prev))} − ${lr} × ${paren(p.grad!.b)} = ${formatNumber(bCode(p))}`,
  ];
}

/**
 * Gradient descent for the line fit (use inside gdExperiment): the path of (slope, intercept) with
 * the least-squares answer marked, the MSE per step, and the arithmetic of the last update.
 */
export function RegressionGD() {
  const { state, result } = useExperimentContext<GDLinState, GDLinResult>('RegressionGD');
  const { run, fit, fitMse } = result;
  const path = run.path;
  const shown: XY[] = path
    .filter((p) => inside(SLOPE, p.slope) && inside(INTERCEPT, p.intercept))
    .map((p) => [p.slope, p.intercept]);
  const offPath = path.length - shown.length;
  const loss: XY[] = path.map((p) => [p.step, p.mse]);
  const offLoss = path.filter((p) => p.mse > LOSS[1]).length;
  const last = path.at(-1)!;
  const prev = path.at(-2);
  const diverged = run.status === 'diverged';

  return (
    <div className={s.layout} data-gd-lin={run.status}>
      <LineChart
        title="Path in (slope, intercept) space"
        xLabel="slope w (kg per cm)"
        yLabel="b (kg)"
        xDomain={SLOPE}
        yDomain={INTERCEPT}
        series={[{ id: 'path', label: 'Gradient descent', points: shown, dots: shown.length <= 60 }]}
        overlay={(x, y) => (
          <g className={svg.err} aria-hidden="true" data-closed-form>
            <line
              x1={x(fit.slope) - 7}
              x2={x(fit.slope) + 7}
              y1={y(fit.intercept) - 7}
              y2={y(fit.intercept) + 7}
              strokeWidth={2.5}
            />
            <line
              x1={x(fit.slope) - 7}
              x2={x(fit.slope) + 7}
              y1={y(fit.intercept) + 7}
              y2={y(fit.intercept) - 7}
              strokeWidth={2.5}
            />
          </g>
        )}
        caption={`Starts at (0, 0). The cross is the least-squares answer (${formatNumber(fit.slope)}, ${formatNumber(fit.intercept)}).${offPath ? ` ${offPath} of ${path.length} points fall outside this chart.` : ''}`}
      />
      <LineChart
        title="MSE per step"
        xLabel="step"
        yLabel="MSE"
        yDomain={LOSS}
        series={[
          { id: 'mse', label: 'MSE of the current line', points: loss },
          {
            id: 'best',
            label: 'Least-squares MSE',
            points: [
              [0, fitMse],
              [Math.max(1, last.step), fitMse],
            ],
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        caption={`Dashed: the lowest possible MSE, ${formatNumber(fitMse)}.${offLoss ? ` ${offLoss} step(s) with MSE above ${LOSS[1]} are above the chart (step 0 has MSE ${formatNumber(path[0]!.mse)}).` : ''}`}
      />
      {prev && (
        <p className={`${s.arithmetic} ${s.full}`} data-gd-update={last.step}>
          <span className={s.label}>
            Update {last.step} (η = {state.lr}, {state.center === 'centered' ? 'centered x' : 'raw x'})
          </span>
          {describeUpdate(prev, last, state.lr, run.shift).map((line) => (
            <span key={line} className={s.math}>
              {line}
            </span>
          ))}
        </p>
      )}
      {diverged && (
        <p className={`${s.diverged} ${s.full}`} role="status">
          <strong>Diverged</strong> at step {run.divergedAt}: each update overshot by more than the last until
          the values passed ±1e6. Lower the learning rate.
        </p>
      )}
    </div>
  );
}
