import { line } from 'd3-shape';
import { FIT_DATA, lambdaOf, type FitResult, type FitState } from '@/lib/classical/fitExperiment';
import { predict, trueCurve } from '@/lib/classical/polyRidge';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ScatterPlot, type ScatterGroup, type ScatterPoint } from '../ScatterPlot/ScatterPlot';
import svg from '../svg/svg.module.css';

const SAMPLES = 200;
const Y_DOMAIN: [number, number] = [-2, 2];
/** Curve values are clamped here before drawing; the plot clips at ±2 anyway. */
const DRAW_LIMIT = 50;

const GROUPS: ScatterGroup[] = [
  { id: 'train', label: 'Training points (fitted)', tone: 'accent', shape: 'circle' },
  { id: 'validation', label: 'Validation points (scored only)', tone: 'ink', shape: 'triangle' },
];

const POINTS: ScatterPoint[] = [
  ...FIT_DATA.train.x.map((x, i) => ({ x, y: FIT_DATA.train.y[i]!, group: 'train', id: `t${i}` })),
  ...FIT_DATA.validation.x.map((x, i) => ({
    x,
    y: FIT_DATA.validation.y[i]!,
    group: 'validation',
    id: `v${i}`,
    hollow: true,
  })),
];

const xs = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
const clamp = (v: number) => Math.max(-DRAW_LIMIT, Math.min(DRAW_LIMIT, v));

/** The training and validation points, the fitted polynomial and the true curve sin(2πx). */
export function PolyFitPlot() {
  const { state, result } = useExperimentContext<FitState, FitResult>('PolyFitPlot');
  const fitted = xs.map((x) => [x, clamp(predict(result.w, x))] as const);
  const truth = xs.map((x) => [x, trueCurve(x)] as const);
  return (
    <ScatterPlot
      title={`Degree ${state.degree} fit, lambda = ${lambdaOf(state.logLambda).toPrecision(2)}`}
      points={POINTS}
      groups={GROUPS}
      xLabel="x"
      yLabel="y"
      xDomain={[0, 1]}
      yDomain={Y_DOMAIN}
      overlay={(x, y) => {
        const path = line<readonly [number, number]>()
          .x((p) => x(p[0]))
          .y((p) => y(p[1]));
        return (
          <g aria-hidden="true">
            <path className={`${svg.muted} ${svg.line} ${svg.dashed}`} d={path(truth) ?? ''} />
            <path className={`${svg.err} ${svg.line}`} d={path(fitted) ?? ''} data-fit-curve />
          </g>
        );
      }}
      caption={
        <>
          Solid line: the degree-{state.degree} polynomial fitted to the 20 filled training points. Dashed
          line: the true curve sin(2πx) the data came from. Training MSE {result.train.toFixed(4)}, validation
          MSE {result.validation.toFixed(4)} (measured on the 20 hollow triangles). Parts of the curve beyond
          ±2 are cut off.
        </>
      }
    />
  );
}
