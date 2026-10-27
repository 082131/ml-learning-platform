import type { TinyRun, TinyState } from '@/lib/deep/tinyNet';
import { fmt } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';

/** The TypeScript twin's loss at every training step (inside an Experiment made with tinyNetExperiment). */
export function TinyNetLoss() {
  const { state, result } = useExperimentContext<TinyState, TinyRun>('TinyNetLoss');
  const first = result.steps[0]!;
  const last = result.steps.at(-1)!;
  return (
    <LineChart
      title="XOR loss per step"
      xLabel="step"
      yLabel="BCE loss"
      series={[
        {
          id: 'loss',
          label: 'loss',
          dots: result.steps.length <= 30,
          points: result.steps.map((s) => [s.step, s.loss] as const),
        },
      ]}
      caption={`Loss before each update, lr = ${state.lr}: ${fmt(first.loss)} at step 0, ${fmt(last.loss)} at step ${last.step}. Predictions after training: ${result.final.map((p) => p.toFixed(4)).join(', ')} for inputs (0,0), (0,1), (1,0), (1,1); XOR wants 0, 1, 1, 0.`}
    />
  );
}
