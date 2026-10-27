import { boundaryInUnits, clipLine, predictProba } from '@/lib/classical/logistic';
import {
  BILL_SCALER,
  BILL_TASK,
  formatP,
  paren,
  type LogResult,
  type LogState,
} from '@/lib/classical/logisticExperiment';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ScatterPlot, type ScatterGroup } from '../ScatterPlot/ScatterPlot';
import { VizTable } from '../VizFrame/VizFrame';
import s from './LogisticBoundary.module.css';

const GROUPS: ScatterGroup[] = [
  { id: 'Adelie', label: 'Adelie (0)', tone: 'ink', shape: 'circle' },
  { id: 'Chinstrap', label: 'Chinstrap (1)', tone: 'accent', shape: 'triangle' },
];
const X: [number, number] = [32, 60];
const Y: [number, number] = [15, 22];
const CELLS_X = 56;
const CELLS_Y = 28;
/** Opacity of the shading where the model is certain of Chinstrap (p = 1). */
const MAX_SHADE = 0.35;

/**
 * Adelie and Chinstrap penguins by bill length and depth, shaded by the model's P(Chinstrap), with
 * the decision boundary p = 0.5 and the selected penguin's numbers (use inside logisticExperiment).
 */
export function LogisticBoundary() {
  const { state, result, update } = useExperimentContext<LogState, LogResult>('LogisticBoundary');
  const { model, probs } = result;
  const line = clipLine(boundaryInUnits(model, BILL_SCALER), X, Y);
  const points = BILL_TASK.all.map((p, i) => ({
    x: p.x[0]!,
    y: p.x[1]!,
    group: p.species,
    id: i,
    hollow: p.split === 'test',
  }));
  const pen = BILL_TASK.all[state.sel]!;
  const pred = result.sel.p >= 0.5 ? 'Chinstrap' : 'Adelie';
  const wrong = BILL_TASK.all.filter((p, i) => (probs[i]! >= 0.5 ? 1 : 0) !== p.label).length;
  const cw = (X[1] - X[0]) / CELLS_X;
  const ch = (Y[1] - Y[0]) / CELLS_Y;

  return (
    <div data-logistic-boundary>
      <ScatterPlot
        title="Bill length and depth, with the decision boundary"
        points={points}
        groups={GROUPS}
        xLabel="bill length (mm)"
        yLabel="bill depth (mm)"
        xDomain={X}
        yDomain={Y}
        selected={[state.sel]}
        onPointClick={(p) => update((st) => ({ ...st, sel: Number(p.id) }))}
        underlay={(x, y) => (
          <g aria-hidden="true">
            {Array.from({ length: CELLS_X * CELLS_Y }, (_, k) => {
              const cx = X[0] + (k % CELLS_X) * cw;
              const cy = Y[0] + Math.floor(k / CELLS_X) * ch;
              const p = predictProba(model, [
                (cx + cw / 2 - BILL_SCALER.mean[0]!) / BILL_SCALER.std[0]!,
                (cy + ch / 2 - BILL_SCALER.mean[1]!) / BILL_SCALER.std[1]!,
              ]);
              return (
                <rect
                  key={k}
                  className={s.shade}
                  x={x(cx)}
                  y={y(cy + ch)}
                  width={x(cx + cw) - x(cx) + 0.5}
                  height={y(cy) - y(cy + ch) + 0.5}
                  opacity={MAX_SHADE * p}
                />
              );
            })}
          </g>
        )}
        overlay={(x, y) =>
          line && (
            <line
              className={s.boundary}
              aria-hidden="true"
              data-boundary
              x1={x(line[0][0])}
              y1={y(line[0][1])}
              x2={x(line[1][0])}
              y2={y(line[1][1])}
            />
          )
        }
        table={
          <VizTable
            caption="Penguins and the model's probabilities"
            columns={[
              '#',
              'CSV row',
              'species',
              'set',
              'bill length',
              'bill depth',
              'P(Chinstrap)',
              'predicted',
            ]}
            rows={BILL_TASK.all.map((p, i) => [
              String(i + 1),
              String(p.row),
              p.species,
              p.split,
              formatNumber(p.x[0]!),
              formatNumber(p.x[1]!),
              formatNumber(probs[i]!),
              probs[i]! >= 0.5 ? 'Chinstrap' : 'Adelie',
            ])}
          />
        }
        caption={
          <>
            Filled markers are the 165 training penguins, hollow ones the 54 test penguins. Darker shading
            means a higher P(Chinstrap); the solid line is the decision boundary, where p = 0.5
            {line ? '' : ' (outside the plotted area for these weights)'}. {wrong} of 219 penguins are on the
            wrong side.
          </>
        }
      />
      <p className={s.arithmetic} data-logistic-point={state.sel}>
        <span className={s.label}>
          Penguin {state.sel + 1} (CSV row {pen.row}, {pen.species},{' '}
          {pen.split === 'train' ? 'training' : 'test'} set): bill {formatNumber(pen.x[0]!)} ×{' '}
          {formatNumber(pen.x[1]!)} mm
        </span>
        <span className={s.math}>
          standardized: x1 = {formatNumber(result.sel.x1)}, x2 = {formatNumber(result.sel.x2)}
        </span>
        <span className={s.math}>
          z = {formatNumber(model.w[0]!)} × {paren(result.sel.x1)} + {paren(model.w[1]!)} ×{' '}
          {paren(result.sel.x2)} + {paren(model.b)} = {formatNumber(result.sel.z)}
        </span>
        <span className={s.math}>
          p = σ(z) = {formatP(result.sel.p)} → predicted {pred} ({pred === pen.species ? 'correct' : 'wrong'})
        </span>
      </p>
    </div>
  );
}
