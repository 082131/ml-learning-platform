import {
  CALC_FUNCTIONS,
  clipLine,
  X_RANGE,
  type DerivResult,
  type DerivState,
} from '@/lib/calculus/derivative';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type Series, type XY } from '../LineChart/LineChart';
import s from './TangentSlope.module.css';

const SAMPLES = 120;

/**
 * A function, its tangent line at x (slope f'(x)) and the secant through x and x + h (slope of the
 * forward difference). Use inside an Experiment made with derivativeExperiment.
 */
export function TangentSlope() {
  const { state, result } = useExperimentContext<DerivState, DerivResult>('TangentSlope');
  const fn = CALC_FUNCTIONS[state.fn] ?? CALC_FUNCTIONS.square!;
  const domain: [number, number] = [X_RANGE.min, X_RANGE.max];
  const curve: XY[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = domain[0] + ((domain[1] - domain[0]) * i) / SAMPLES;
    return [x, fn.f(x)];
  });
  const ys = curve.map((p) => p[1]);
  const yRange: [number, number] = [Math.min(...ys), Math.max(...ys)];
  const h = Number(state.h);
  const series: Series[] = [{ id: 'f', label: fn.label, points: curve, tone: 'muted', inTable: false }];
  const tangent = Number.isNaN(result.exact)
    ? undefined
    : clipLine(state.x, result.fx, result.exact, domain, yRange);
  if (tangent)
    series.push({ id: 'tangent', label: `Tangent, slope ${formatNumber(result.exact)}`, points: tangent });
  const secant = clipLine(state.x, result.fx, result.forward, domain, yRange);
  if (secant)
    series.push({
      id: 'secant',
      label: `Secant over h = ${state.h}, slope ${formatNumber(result.forward)}`,
      points: secant,
      tone: 'ink',
      dashed: true,
    });

  return (
    <div className={s.wrap} data-tangent-x={state.x}>
      <LineChart
        title="Slope at a point"
        xLabel="x"
        yLabel="f(x)"
        xDomain={domain}
        yDomain={yRange}
        series={series}
        overlay={(x, y) => (
          <g aria-hidden="true" className={s.points}>
            <circle cx={x(state.x)} cy={y(result.fx)} r={5} />
            {Math.abs(x(state.x + h) - x(state.x)) > 2 && (
              <circle cx={x(state.x + h)} cy={y(fn.f(state.x + h))} r={4} className={s.secondary} />
            )}
          </g>
        )}
        caption={
          Number.isNaN(result.exact)
            ? `At x = ${formatNumber(state.x)} the graph has a corner, so there is no tangent. The secant over h = ${state.h} has slope ${formatNumber(result.forward)}.`
            : `At x = ${formatNumber(state.x)}, f(x) = ${formatNumber(result.fx)} and the tangent's slope is f'(x) = ${formatNumber(result.exact)}. The secant over h = ${state.h} has slope ${formatNumber(result.forward)}.`
        }
      />
    </div>
  );
}
