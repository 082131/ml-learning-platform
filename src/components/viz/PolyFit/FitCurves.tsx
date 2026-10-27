import { LOG_LAMBDAS, MAX_DEGREE, type FitResult, type FitState } from '@/lib/classical/fitExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type Series } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';
import s from './PolyFit.module.css';

const Y_MAX = 1;

const errorSeries = (xs: number[], rows: { train: number; validation: number }[]): Series[] => [
  {
    id: 'train',
    label: 'Training MSE',
    points: rows.map((r, i) => [xs[i]!, r.train]),
    tone: 'accent',
    dots: true,
  },
  {
    id: 'validation',
    label: 'Validation MSE',
    points: rows.map((r, i) => [xs[i]!, r.validation]),
    tone: 'err',
    dashed: true,
    dots: true,
  },
];

const marker = (at: number) => {
  function Marker(x: (n: number) => number, y: (n: number) => number) {
    return (
      <line
        className={svg.muted}
        x1={x(at)}
        x2={x(at)}
        y1={y(0)}
        y2={y(Y_MAX)}
        strokeDasharray="2 3"
        aria-hidden="true"
      />
    );
  }
  return Marker;
};

const offChart = (rows: { train: number; validation: number }[]) =>
  rows.filter((r) => r.validation > Y_MAX || r.train > Y_MAX).length;

/** Training and validation MSE against degree (current λ) and against log₁₀ λ (current degree). */
export function FitCurves() {
  const { state, result } = useExperimentContext<FitState, FitResult>('FitCurves');
  const degrees = Array.from({ length: MAX_DEGREE + 1 }, (_, d) => d);
  const hiddenD = offChart(result.byDegree);
  const hiddenL = offChart(result.byLambda);
  const best = result.byDegree[result.bestDegree]!;
  return (
    <div className={s.curves}>
      <LineChart
        title={`Error vs degree, lambda = 10^${state.logLambda}`}
        xLabel="degree d"
        yLabel="MSE"
        yDomain={[0, Y_MAX]}
        xDomain={[0, MAX_DEGREE]}
        series={errorSeries(degrees, result.byDegree)}
        overlay={marker(state.degree)}
        caption={`Validation MSE is lowest at degree ${result.bestDegree} (${best.validation.toFixed(4)}). The dotted line marks the current degree.${hiddenD ? ` Off the chart (above ${Y_MAX}): ${hiddenD} of the values; the table lists them all.` : ''}`}
      />
      <LineChart
        title={`Error vs log₁₀ lambda, degree ${state.degree}`}
        xLabel="log₁₀ λ"
        yLabel="MSE"
        yDomain={[0, Y_MAX]}
        series={errorSeries(LOG_LAMBDAS, result.byLambda)}
        overlay={marker(state.logLambda)}
        caption={`Validation MSE is lowest at log₁₀ λ = ${result.bestLogLambda}. Larger λ (right) means a stiffer curve. The dotted line marks the current λ.${hiddenL ? ` Off the chart (above ${Y_MAX}): ${hiddenL} of the values; the table lists them all.` : ''}`}
      />
    </div>
  );
}
