import { formatScore, type SplitResult, type SplitState } from '@/lib/classical/splitsExperiment';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './SplitLeakage.module.css';

const CHANCE = 0.5;

/**
 * Test accuracy of the same model with and without the leak, for the current split, then the mean
 * over split seeds 1 to 50 for every k. The data is pure noise, so honest accuracy should sit near 50%.
 */
export function LeakageScores() {
  const { state, result } = useExperimentContext<SplitState, SplitResult>('LeakageScores');
  const rows = [
    { id: 'honest', label: 'No leak: features chosen on training rows', score: result.honest },
    { id: 'leaked', label: 'Leak: features chosen on all rows', score: result.leaked },
  ] as const;
  const title = `Test accuracy, seed ${state.seed}, k = ${state.k}`;
  return (
    <div className={s.scores}>
      <VizFrame
        title={title}
        caption={`The dashed line is 50%, the true accuracy of any model on this noise. Current mode: ${state.leak === 'on' ? 'leak' : 'no leak'}.`}
        table={
          <VizTable
            caption={title}
            columns={['Pipeline', 'Correct / test rows', 'Features kept']}
            rows={rows.map((r) => [r.label, formatScore(r.score), r.score.features.join(', ')])}
          />
        }
      >
        <ul className={s.bars}>
          {rows.map((r) => {
            const active = (r.id === 'leaked') === (state.leak === 'on');
            return (
              <li key={r.id} data-score={r.id} className={cx(s.barRow, active && s.active)}>
                <span className={s.barLabel}>
                  {r.label}
                  {active && <span className={s.tag}>current mode</span>}
                </span>
                <span className={s.track} aria-hidden="true">
                  <span
                    className={cx(s.fill, r.id === 'leaked' && s.fillLeak)}
                    style={{ width: `${100 * r.score.accuracy}%` }}
                  />
                  <span className={s.chance} style={{ left: `${100 * CHANCE}%` }} />
                </span>
                <span className={s.barValue}>{formatScore(r.score)}</span>
              </li>
            );
          })}
        </ul>
      </VizFrame>
      <LineChart
        title="Mean test accuracy over split seeds 1–50"
        xLabel="features kept (k)"
        yLabel="test accuracy"
        yDomain={[0.3, 1]}
        height={240}
        series={[
          {
            id: 'honest',
            label: 'No leak',
            points: result.curve.map((p) => [p.k, p.honest]),
            tone: 'accent',
          },
          {
            id: 'leaked',
            label: 'Leak',
            points: result.curve.map((p) => [p.k, p.leaked]),
            tone: 'err',
            dashed: true,
          },
          {
            id: 'chance',
            label: 'Chance (50%)',
            points: [
              [1, CHANCE],
              [result.curve.length, CHANCE],
            ],
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        overlay={(x, y) => (
          <line
            className={svg.muted}
            x1={x(state.k)}
            x2={x(state.k)}
            y1={y(0.3)}
            y2={y(1)}
            strokeDasharray="2 3"
            aria-hidden="true"
          />
        )}
        caption={`At k = ${state.k}: no leak ${(100 * result.curve[state.k - 1]!.honest).toFixed(1)}%, leak ${(100 * result.curve[state.k - 1]!.leaked).toFixed(1)}%, averaged over 50 different splits of the same noise data. The dotted line marks the current k.`}
      />
    </div>
  );
}
