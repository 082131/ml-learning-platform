import type { TrainResult, TrainState } from '@/lib/deep/trainingExperiment';
import { fmt } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';

/** Training and validation loss on the whole sets after every epoch: the smooth curves to judge a run by. */
export function TrainingCurves() {
  const { state, result } = useExperimentContext<TrainState, TrainResult>('TrainingCurves');
  const { run } = result;
  const last = run.epochs.at(-1)!;
  const best = run.epochs.reduce((b, e) => (e.valLoss < b.valLoss ? e : b));
  return (
    <LineChart
      title="Loss curves per epoch"
      xLabel="epoch"
      yLabel="loss (BCE)"
      series={[
        {
          id: 'train',
          label: 'Training loss (all 100 points)',
          points: run.epochs.map((e) => [e.epoch, e.trainLoss] as const),
        },
        {
          id: 'val',
          label: 'Validation loss (50 held-out points)',
          tone: 'ok',
          dashed: true,
          points: run.epochs.map((e) => [e.epoch, e.valLoss] as const),
        },
      ]}
      caption={`Epoch 0 is before training. After epoch ${state.epochs}: training loss ${fmt(last.trainLoss)}, validation loss ${fmt(last.valLoss)}. The lowest validation loss, ${fmt(best.valLoss)}, came after epoch ${best.epoch}.`}
    />
  );
}

/** The loss of every mini-batch, before its update: the noisy signal each step actually follows. */
export function BatchLossCurve() {
  const { state, result } = useExperimentContext<TrainState, TrainResult>('BatchLossCurve');
  const { run } = result;
  return (
    <LineChart
      title="Mini-batch loss per iteration"
      xLabel="iteration"
      yLabel="batch loss"
      series={[
        {
          id: 'batch',
          label: 'Mini-batch loss',
          tone: 'muted',
          inTable: run.iters.length <= 1000,
          points: run.iters.map((it) => [it.iter, it.loss] as const),
        },
      ]}
      caption={`${run.iters.length} iterations: ${run.stepsPerEpoch} per epoch × ${state.epochs} epochs, batch size ${state.batch}. Each point is the loss of one batch of up to ${state.batch} example${state.batch === 1 ? '' : 's'}, so it scatters around the epoch curve above.`}
    />
  );
}
