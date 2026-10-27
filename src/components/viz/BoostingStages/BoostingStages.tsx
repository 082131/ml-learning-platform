import { boostPredict, predictStump } from '@/lib/classical/ensembles';
import { BOOST_X, BOOST_Y, TOY, type BoostResult, type BoostState } from '@/lib/classical/treesExperiments';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { ScatterPlot } from '../ScatterPlot/ScatterPlot';
import svg from '../svg/svg.module.css';
import s from './BoostingStages.module.css';

const GRID = 200;
const X_DOMAIN: [number, number] = [178, 220];
/** The penguin whose update is written out: row 305, 205 mm flippers, 4550 g. */
const FOCUS = TOY.findIndex((p) => p.row === 305);

/** Gradient boosting with stumps on the toy penguins: prediction, residuals and training error per stage. */
export function BoostingStages() {
  const { state, result } = useExperimentContext<BoostState, BoostResult>('BoostingStages');
  const { run, lr } = result;
  const m = state.stages;
  const stage = run.stages[m - 1]!;
  const pred = stage.prediction;
  const curve = Array.from({ length: GRID + 1 }, (_, i) => {
    const x = X_DOMAIN[0] + ((X_DOMAIN[1] - X_DOMAIN[0]) * i) / GRID;
    return [x, boostPredict(run, lr, m, x)] as const;
  });
  const points = BOOST_X.map((x, i) => ({ x, y: BOOST_Y[i]!, group: 'penguin', id: TOY[i]!.row }));
  const before = m === 1 ? run.init : run.stages[m - 2]!.prediction[FOCUS]!;
  const h = predictStump(stage.stump, BOOST_X[FOCUS]!);
  return (
    <div className={s.layout} data-boost-stage={m}>
      <ScatterPlot
        title={`Prediction after ${m} stage${m === 1 ? '' : 's'}`}
        points={points}
        groups={[{ id: 'penguin', label: 'penguin (actual mass)', tone: 'accent', shape: 'circle' }]}
        xLabel="flipper_length_mm"
        yLabel="body_mass_g"
        xDomain={X_DOMAIN}
        yDomain={[2800, 5200]}
        height={260}
        selected={[305]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            <g className={svg.muted}>
              {BOOST_X.map((xv, i) => (
                <line
                  key={i}
                  x1={x(xv)}
                  x2={x(xv)}
                  y1={y(BOOST_Y[i]!)}
                  y2={y(pred[i]!)}
                  strokeWidth={1.5}
                  className={svg.dashed}
                />
              ))}
            </g>
            <g className={svg.ink}>
              <path
                className={svg.line}
                d={curve.map(([cx, cy], i) => `${i ? 'L' : 'M'}${x(cx)},${y(cy)}`).join('')}
              />
            </g>
          </g>
        )}
        caption={`Solid line: the model's prediction. Dashed: each penguin's residual (actual − predicted). Training MSE ${formatNumber(Math.round(run.mse[m]! * 10) / 10)}.`}
      />
      <LineChart
        title="Training MSE per stage"
        xLabel="stage"
        yLabel="MSE (g²)"
        height={260}
        series={[{ id: 'mse', label: 'MSE', points: run.mse.map((v, i) => [i, v] as const), dots: true }]}
        overlay={(x, y) => (
          <g className={svg.ink} aria-hidden="true">
            <circle cx={x(m)} cy={y(run.mse[m]!)} r={8} fill="none" strokeWidth={2} />
          </g>
        )}
        caption={`Stage 0 predicts the mean, ${formatNumber(run.init)} g, for everyone (MSE ${formatNumber(Math.round(run.mse[0]!))}). Circled: stage ${m}.`}
      />
      <p className={s.arithmetic} data-boost-arithmetic>
        <span className={s.label}>Stage {m}, row 305</span>
        <span className={s.math}>
          residual = {formatNumber(BOOST_Y[FOCUS]!)} − {formatNumber(before)} ={' '}
          {formatNumber(stage.residuals[FOCUS]!)}
        </span>
        <span className={s.math}>
          stump: flipper ≤ {formatNumber(stage.stump.threshold)} ? {formatNumber(stage.stump.left)} :{' '}
          {formatNumber(stage.stump.right)} → h = {formatNumber(h)}
        </span>
        <span className={s.math}>
          F{m} = {formatNumber(before)} + {lr} × {formatNumber(h)} = {formatNumber(pred[FOCUS]!)}
        </span>
      </p>
    </div>
  );
}
