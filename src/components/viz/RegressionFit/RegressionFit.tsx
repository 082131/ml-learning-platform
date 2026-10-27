import {
  describePoint,
  lineLabel,
  REG_POINTS,
  type FitResult,
  type FitState,
} from '@/lib/classical/linearRegressionExperiment';
import { roundTo } from '@/lib/math/numeric';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ScatterPlot, type ScatterGroup } from '../ScatterPlot/ScatterPlot';
import { VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './RegressionFit.module.css';

const GROUPS: ScatterGroup[] = [{ id: 'penguin', label: 'Penguin (measured)', tone: 'ink', shape: 'circle' }];
const X_DOMAIN: [number, number] = [17, 23];
const Y_DOMAIN: [number, number] = [2.5, 6];

/**
 * The 12 penguins with the current line ŷ = w·x + b, each residual drawn as a vertical segment, and
 * the arithmetic of the selected penguin's squared residual (use inside fitExperiment).
 */
export function RegressionFit() {
  const { state, result, update } = useExperimentContext<FitState, FitResult>('RegressionFit');
  const { w, b, sel } = state;
  const row = result.rows[sel]!;
  const d = describePoint(state, row);
  const points = REG_POINTS.map((p, i) => ({ x: p.x, y: p.y, group: 'penguin', id: i }));
  const showBest = state.best === 'show';
  const above = result.rows.filter((r) => r.r > 0).length;

  return (
    <div data-regression-fit>
      <ScatterPlot
        title="Body mass against flipper length"
        points={points}
        groups={GROUPS}
        xLabel="flipper length (cm)"
        yLabel="body mass (kg)"
        xDomain={X_DOMAIN}
        yDomain={Y_DOMAIN}
        selected={[sel]}
        onPointClick={(p) => update((st) => ({ ...st, sel: Number(p.id) }))}
        overlay={(x, y) => (
          <g aria-hidden="true">
            {result.rows.map((r, i) => (
              <line
                key={i}
                className={i === sel ? s.residualSelected : s.residual}
                x1={x(r.x)}
                x2={x(r.x)}
                y1={y(r.y)}
                y2={y(r.yHat)}
                data-residual={i}
              />
            ))}
            <g className={svg.accent} data-line="yours">
              <line
                className={svg.line}
                x1={x(X_DOMAIN[0])}
                x2={x(X_DOMAIN[1])}
                y1={y(w * X_DOMAIN[0] + b)}
                y2={y(w * X_DOMAIN[1] + b)}
              />
            </g>
            {showBest && (
              <g className={svg.muted} data-line="least-squares">
                <line
                  className={`${svg.line} ${svg.dashed}`}
                  x1={x(X_DOMAIN[0])}
                  x2={x(X_DOMAIN[1])}
                  y1={y(result.fit.slope * X_DOMAIN[0] + result.fit.intercept)}
                  y2={y(result.fit.slope * X_DOMAIN[1] + result.fit.intercept)}
                />
              </g>
            )}
          </g>
        )}
        table={
          <VizTable
            caption="Penguins, predictions and residuals"
            columns={['#', 'CSV row', 'species', 'x (cm)', 'y (kg)', 'ŷ (kg)', 'r = y − ŷ', 'r²']}
            rows={result.rows.map((r, i) => [
              String(i + 1),
              String(REG_POINTS[i]!.row),
              REG_POINTS[i]!.species,
              formatNumber(r.x),
              formatNumber(r.y),
              formatNumber(r.yHat),
              formatNumber(r.r),
              formatNumber(r.r2),
            ])}
          />
        }
        caption={
          <>
            Your line {lineLabel(w, b)} (solid){showBest && ', the least-squares line (dashed)'}. Dashed
            vertical segments are the residuals: {above} penguins are above the line and {12 - above} on or
            below it. MSE = {formatNumber(result.mse)} kg².
          </>
        }
      />
      <p className={s.arithmetic} data-fit-point={sel}>
        <span className={s.label}>
          Penguin {sel + 1} (CSV row {REG_POINTS[sel]!.row}, {REG_POINTS[sel]!.species}): x ={' '}
          {formatNumber(row.x)} cm, y = {formatNumber(row.y)} kg
        </span>
        <span className={s.math}>{d.yHat}</span>
        <span className={s.math}>{d.r}</span>
        <span className={s.math}>{d.r2}</span>
        <span className={s.detail}>
          Adding all 12 squared residuals gives {formatNumber(result.total)}; dividing by 12 gives MSE ={' '}
          {formatNumber(result.mse)} kg². This penguin contributes{' '}
          {formatNumber(roundTo((100 * row.r2) / result.total, 1))}% of the sum.
        </span>
      </p>
    </div>
  );
}
