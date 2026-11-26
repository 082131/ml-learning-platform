import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { ScheduleResult, ScheduleState } from '@/lib/finetune/experiments';
import type { BatchInput, BatchResult } from '@/lib/finetune/schedule';
import type { SftInput, SftResult } from '@/lib/finetune/sft';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

/** The learning rate over a run. */
export function LrScheduleView() {
  const { result: r } = useExperimentContext<ScheduleState, ScheduleResult>('LrScheduleView');
  return (
    <div data-lr-end={r.curve[r.curve.length - 1]![1].toExponential(2)} data-warmup={r.input.warmupSteps}>
      <LineChart
        title="Learning rate per optimizer step"
        xLabel="step"
        yLabel="learning rate"
        xDomain={[0, r.input.totalSteps]}
        yDomain={[0, r.input.peak * 1.05]}
        series={[{ id: 'lr', label: `${r.input.kind} schedule`, points: r.curve, tone: 'accent' }]}
        caption={`Warmup for ${r.input.warmupSteps} steps up to ${r.input.peak.toExponential(0)}, then ${r.input.kind === 'constant' ? 'flat' : `down to ${(r.input.peak * r.input.minRatio).toExponential(1)}`} by step ${r.input.totalSteps}.`}
      />
    </div>
  );
}

/** How micro batches, accumulation and GPUs multiply into one optimizer step. */
export function BatchView() {
  const { state, result: r } = useExperimentContext<BatchInput, BatchResult>('BatchView');
  const parts = [
    { label: 'micro batch per GPU', value: state.microBatch },
    { label: '× accumulation steps', value: state.gradAccum },
    { label: '× GPUs', value: state.gpus },
    { label: '= sequences per step', value: r.sequencesPerStep },
    { label: `× ${state.seqLen.toLocaleString('en-US')} tokens`, value: r.tokensPerStep },
  ];
  return (
    <VizFrame
      title="One optimizer step"
      caption={`${state.microBatch} × ${state.gradAccum} × ${state.gpus} = ${r.sequencesPerStep} sequences, ${r.tokensPerStep.toLocaleString('en-US')} tokens per step; ${r.stepsPerEpoch} steps per epoch of 20 M tokens.`}
      table={<VizTable caption="Batch arithmetic" columns={['factor', 'value']} rows={parts.map((p) => [p.label, p.value])} />}
    >
      <ol className={s.list} data-tokens-per-step={r.tokensPerStep}>
        {parts.map((p) => (
          <li key={p.label} className={s.row}>
            <span>{p.label}</span>
            <span className={s.mono}>{p.value.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}

/** Simulated training and validation loss, and a general-skills score, over epochs. */
export function SftCurves() {
  const { state, result: r } = useExperimentContext<SftInput, SftResult>('SftCurves');
  const top = Math.max(2.1, ...r.points.map((p) => Math.max(p.train, p.val)));
  return (
    <div data-best-epoch={r.best.epoch} data-gap={r.overfitGap} data-diverged={r.diverged}>
      <LineChart
        title="Loss during fine-tuning"
        badge={<Badge tone="simulated">Simulated</Badge>}
        xLabel="epoch"
        yLabel="loss"
        xDomain={[0, state.epochs]}
        yDomain={[0, top * 1.05]}
        series={[
          { id: 'train', label: 'training loss', points: r.points.map((p) => [p.epoch, p.train] as const), tone: 'muted', dashed: true },
          { id: 'val', label: 'validation loss', points: r.points.map((p) => [p.epoch, p.val] as const), tone: 'accent', dots: true },
        ]}
        overlay={(x, y) => <circle cx={x(r.best.epoch)} cy={y(r.best.val)} r={6} fill="none" stroke="currentColor" strokeWidth={2} />}
        caption={r.diverged ? 'The learning rate is far too high: the loss jumps up and stays there.' : `Validation loss is lowest at epoch ${r.best.epoch} (circled, ${r.best.val.toFixed(3)}). ${r.overfitGap > 0.05 ? `After that it rises by ${r.overfitGap.toFixed(2)} while training loss keeps falling: the model is memorizing.` : 'It has not started rising yet.'}`}
      />
      <LineChart
        title="General skills while specializing"
        badge={<Badge tone="simulated">Simulated</Badge>}
        xLabel="epoch"
        yLabel="score (%)"
        xDomain={[0, state.epochs]}
        yDomain={[0, 70]}
        height={180}
        series={[{ id: 'general', label: 'general-knowledge score', points: r.points.map((p) => [p.epoch, p.general] as const), tone: 'err' }]}
        caption={`From 62 before fine-tuning to ${r.points[r.points.length - 1]!.general} after ${state.epochs} epochs (${state.method === 'lora' ? 'LoRA changes fewer weights and forgets less' : 'full fine-tuning changes every weight'}).`}
      />
    </div>
  );
}
