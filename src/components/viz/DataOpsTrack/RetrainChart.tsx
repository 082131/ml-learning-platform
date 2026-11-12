import { ACCURACY_FLOOR, JUMP_WEEK, WEEKS, type RetrainResult, type RetrainState } from '@/lib/dataops/retraining';
import { pyFixed } from '@/lib/practice/pyFormat';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';
import t from '../SqlQueryTable/DataTable.module.css';

const Y_DOMAIN: [number, number] = [0.55, 0.95];

/**
 * Weekly accuracy over a year under the chosen retraining policy, with retraining weeks and the sudden shift
 * marked. Use inside a retrainExperiment.
 */
export function RetrainChart() {
  const { result: r } = useExperimentContext<RetrainState, RetrainResult>('RetrainChart');
  return (
    <div data-retrains={r.retrains.join(',')} data-mean={pyFixed(r.mean, 4)}>
      <LineChart
        title="Weekly accuracy under the policy"
        badge={<span className={t.legend}>Decay model</span>}
        xLabel="week"
        yLabel="accuracy"
        xDomain={[0, WEEKS - 1]}
        yDomain={Y_DOMAIN}
        series={[
          {
            id: 'accuracy',
            label: 'accuracy',
            points: r.accuracy.map((a, w) => [w, a] as const),
            tone: 'accent',
          },
        ]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            <g className={svg.muted}>
              <line
                className={`${svg.line} ${svg.dashed}`}
                x1={x(0)}
                x2={x(WEEKS - 1)}
                y1={y(ACCURACY_FLOOR)}
                y2={y(ACCURACY_FLOOR)}
              />
            </g>
            <g className={svg.err}>
              <line className={svg.line} x1={x(JUMP_WEEK)} x2={x(JUMP_WEEK)} y1={y(Y_DOMAIN[0])} y2={y(Y_DOMAIN[1])} />
              <text className={svg.label} x={x(JUMP_WEEK) + 4} y={y(Y_DOMAIN[0]) - 6}>
                shift
              </text>
            </g>
            <g className={svg.ok}>
              {r.retrains.map((w) => (
                <circle key={w} cx={x(w)} cy={y(r.accuracy[w]!)} r={5} data-retrain-week={w} />
              ))}
            </g>
          </g>
        )}
        caption={
          <>
            {r.retrains.length} retraining run{r.retrains.length === 1 ? '' : 's'} (green dots
            {r.retrains.length ? `: weeks ${r.retrains.join(', ')}` : ''}). Mean accuracy {pyFixed(r.mean, 4)}, worst
            week {pyFixed(r.worst, 3)}. The red line marks the sudden shift in week {JUMP_WEEK}; the dashed line is
            the 0.88 floor the accuracy trigger watches.
          </>
        }
      />
    </div>
  );
}
