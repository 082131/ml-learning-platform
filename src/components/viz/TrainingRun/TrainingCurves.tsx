import type { TrainResult, TrainState } from '@/lib/deep/trainingExperiment';
import { fmt } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';

/** Mini-batch loss at every iteration, and the full training and validation loss after every epoch. */
export function TrainingCurves() {
  const { state, result } = useExperimentContext<TrainState, TrainResult>('TrainingCurves');
  const { run } = result;
  const spe = run.stepsPerEpoch;
  const last = run.epochs.at(-1)!;
  return (
    <LineChart
      title="Loss curves"
      xLabel="epoch"
      yLabel="loss (BCE)"
      series={[
        {
          id: 'batch',
          label: 'Mini-batch loss (each iteration)',
          tone: 'muted',
          inTable: false,
          points: run.iters.map((it) => [(it.iter - 1) / spe, it.loss] as const),
        },
        {
          id: 'train',
          label: 'Training loss (whole set)',
          points: run.epochs.map((e) => [e.epoch, e.trainLoss] as const),
        },
        {
          id: 'val',
          label: 'Validation loss',
          tone: 'ink',
          dashed: true,
          points: run.epochs.map((e) => [e.epoch, e.valLoss] as const),
        },
      ]}
      caption={`${run.iters.length} iterations (${spe} per epoch, batch size ${state.batch}). Each gray point is one batch's loss before its update, plotted at its position within the epoch. After epoch ${state.epochs}: training loss ${fmt(last.trainLoss)}, validation loss ${fmt(last.valLoss)}.`}
    />
  );
}
