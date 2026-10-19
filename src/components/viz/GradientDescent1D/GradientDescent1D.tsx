import { describeStep, FUNCTIONS, QUADRATIC, type GDRun, type GDState } from '@/lib/ml/gradientDescent';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type XY } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';
import s from './GradientDescent1D.module.css';

const CURVE_SAMPLES = 120;

/**
 * Gradient descent on a 1-D function (use inside an Experiment made with gradientDescentExperiment).
 * Left: the function with every visited x. Right: f(x) per step. Below: the inspected update's arithmetic.
 */
export function GradientDescent1D() {
  const { state, result } = useExperimentContext<GDState, GDRun>('GradientDescent1D');
  const fn = FUNCTIONS[state.fn] ?? QUADRATIC;
  const [a, b] = fn.domain;
  const curve: XY[] = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / CURVE_SAMPLES;
    return [x, fn.f(x)];
  });
  const visited: XY[] = result.xs.map((x) => [x, fn.f(x)]);
  const inspect = Math.min(state.inspect, result.steps.length - 1);
  const step = result.steps[inspect]!;
  const yMax = Math.max(...curve.map((p) => p[1]));
  const yMin = Math.min(...curve.map((p) => p[1]));
  const diverged = result.status === 'diverged';

  return (
    <div className={s.layout} data-gd-status={result.status}>
      <LineChart
        title={`f(x) = ${fn.python}`}
        xLabel="x"
        yLabel="f(x)"
        xDomain={[a, b]}
        yDomain={[yMin, yMax]}
        series={[
          { id: 'f', label: 'f(x)', points: curve, tone: 'muted', inTable: false },
          { id: 'path', label: 'Visited x', points: visited, tone: 'accent', dots: true, dashed: true },
        ]}
        overlay={(x, y) =>
          [step.x, step.next].every((v) => v >= a && v <= b) && Number.isFinite(fn.f(step.next)) ? (
            <g className={svg.err} aria-hidden="true">
              <line
                x1={x(step.x)}
                x2={x(step.next)}
                y1={y(step.fx)}
                y2={y(fn.f(step.next))}
                strokeWidth={2.5}
              />
              <circle cx={x(step.x)} cy={y(step.fx)} r={6} fill="none" strokeWidth={2} />
            </g>
          ) : null
        }
        caption={`${visited.length} x values visited. The circled point is step ${inspect + 1}; points outside the plotted range are listed in the table.`}
      />
      <LineChart
        title="Loss per step"
        xLabel="step"
        yLabel="f(x)"
        series={[
          { id: 'loss', label: 'f(x)', points: visited.map((p, k) => [k, p[1]] as const), dots: true },
        ]}
        caption={
          diverged
            ? 'The loss grows without bound: gradient descent diverged.'
            : 'The loss after each update.'
        }
      />
      <p className={s.arithmetic} data-gd-step={inspect}>
        <span className={s.label}>Step {inspect + 1}</span>
        <span className={s.math}>{describeStep(step, state.lr)}</span>
        <span className={s.detail}>
          The gradient at x = {formatNumber(step.x)} is f'(x) = {formatNumber(step.grad)}, so the step moves x
          by {formatNumber(-state.lr * step.grad)}.
        </span>
      </p>
      {diverged && (
        <p className={s.diverged} role="status">
          <strong>Diverged</strong> at step {result.divergedAt! + 1}: each update overshot the minimum by more
          than the last, until x left the safe numeric range. Lower the learning rate.
        </p>
      )}
    </div>
  );
}
