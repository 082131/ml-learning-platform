import { EPOCHS, type TuningResult, type TuningState } from '@/lib/practice/tuning';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';

/**
 * Validation loss per epoch of one training run, with where early stopping keeps the model (best
 * epoch, ringed), where it stops (dashed line) and the true minimum (+). Use inside a tuningExperiment.
 */
export function EarlyStoppingChart() {
  const { state, result } = useExperimentContext<TuningState, TuningResult>('EarlyStoppingChart');
  const { bestEpoch, stopped } = result.stop;
  const seen = result.curve.slice(0, stopped).map((v, i) => [i + 1, v] as const);
  const unseen = result.curve.slice(stopped - 1).map((v, i) => [i + stopped, v] as const);
  return (
    <LineChart
      title={`Early stopping with patience ${state.patience}`}
      xLabel="epoch"
      yLabel="val loss"
      xDomain={[1, EPOCHS]}
      series={[
        { id: 'seen', label: 'trained', points: seen },
        { id: 'unseen', label: 'not trained (stopped)', points: unseen, tone: 'muted', dashed: true },
      ]}
      overlay={(x, y) => {
        const tb = result.trueBestEpoch;
        return (
          <g aria-hidden="true">
            <line
              className={svg.err}
              x1={x(stopped)}
              x2={x(stopped)}
              y1={y(Math.max(...result.curve))}
              y2={y(Math.min(...result.curve))}
              strokeDasharray="4 4"
            />
            <circle
              className={svg.accent}
              cx={x(bestEpoch)}
              cy={y(result.curve[bestEpoch - 1]!)}
              r={8}
              style={{ fill: 'none' }}
              strokeWidth={2.5}
            />
            <path
              className={svg.ink}
              strokeWidth={2}
              d={`M${x(tb) - 6},${y(result.curve[tb - 1]!)}h12M${x(tb)},${y(result.curve[tb - 1]!) - 6}v12`}
            />
          </g>
        );
      }}
      caption={`Stopped after epoch ${stopped} (dashed line), keeping epoch ${bestEpoch} (ringed). The lowest loss of all ${EPOCHS} epochs is at epoch ${result.trueBestEpoch} (+). The curve is the lesson's formula with seeded noise, not a trained model.`}
    />
  );
}
