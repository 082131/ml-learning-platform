import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { LoraMatResult, LoraMatState, LoraState, MemoryResult, MemoryState } from '@/lib/finetune/experiments';
import { getModel, type LoraCount, type Mat } from '@/lib/finetune/lora';
import { gb } from '@/lib/finetune/memory';
import { human } from '@/lib/finetune/scaling';
import { StackedBars } from '../StackedBars/StackedBars';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

/** Per-matrix full size versus LoRA size, for one transformer block. */
export function LoraCountView() {
  const { state, result: r } = useExperimentContext<LoraState, LoraCount>('LoraCountView');
  const m = getModel(state.model);
  const max = Math.max(...r.perLayer.map((l) => l.full));
  return (
    <VizFrame
      title="What LoRA trains in one block"
      caption={`Rank ${state.rank} on ${r.perLayer.length} matrices per block × ${m.layers} blocks = ${human(r.trainable, 2)} trainable numbers, ${(r.share * 100).toFixed(2)}% of the model.`}
      table={<VizTable caption="Per block" columns={['matrix', 'shape (out × in)', 'full', 'LoRA r·(in+out)']} rows={r.perLayer.map((l) => [l.name, `${l.out} × ${l.in}`, l.full.toLocaleString('en-US'), l.lora.toLocaleString('en-US')])} />}
    >
      <ul className={s.bars} data-trainable={r.trainable}>
        {r.perLayer.map((l) => (
          <li key={l.name} className={s.bar}>
            <span className={s.barLabel}>
              <code className={s.mono}>{l.name}</code>
            </span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone="muted" style={{ width: `${(l.full / max) * 100}%` }} />
              <span className={s.barFill} style={{ width: `${Math.max(0.6, (l.lora / max) * 100)}%` }} />
            </span>
            <span className={s.barValue}>
              {human(l.lora)} / {human(l.full)}
            </span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>Grey: numbers in the full matrix. Blue: numbers LoRA trains instead (B and A).</p>
    </VizFrame>
  );
}

function MatrixBox({ title, m, changed }: { title: string; m: Mat; changed?: Mat }) {
  return (
    <div>
      <p className={s.matTitle}>{title}</p>
      <div className={s.mat} style={{ gridTemplateColumns: `repeat(${m[0]!.length}, auto)` }} role="table" aria-label={title}>
        {m.flatMap((row, i) =>
          row.map((v, j) => (
            <span key={`${i}-${j}`} role="cell" className={s.matCell} data-changed={changed ? changed[i]![j] !== 0 : undefined}>
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </span>
          )),
        )}
      </div>
    </div>
  );
}

/** W + (alpha/r)·B·A on a 4 × 4 example. */
export function LoraMatrixView() {
  const { state, result: r } = useExperimentContext<LoraMatState, LoraMatResult>('LoraMatrixView');
  return (
    <VizFrame
      title="A low-rank update"
      caption={`ΔW = (${state.alpha} / ${state.rank}) · B · A has rank ${r.deltaRank}. Training ${r.numbers.lora} numbers changes all 16 entries of W.`}
      table={<VizTable caption="Merged weights W + ΔW" columns={['row', 'c1', 'c2', 'c3', 'c4']} rows={r.merged.map((row, i) => [i + 1, ...row.map((v) => v.toFixed(2))])} />}
    >
      <div className={s.mats} data-rank={r.deltaRank} data-merged={r.merged[0]!.join(',')}>
        <MatrixBox title="W (frozen)" m={r.w} />
        <span className={s.op}>+ {r.scale} ·</span>
        <MatrixBox title={`B (4 × ${state.rank})`} m={r.b} />
        <MatrixBox title={`A (${state.rank} × 4)`} m={r.a} />
        <span className={s.op}>=</span>
        <MatrixBox title="W + ΔW (merged)" m={r.merged} changed={r.delta} />
      </div>
      <p className={s.muted}>Outlined cells are the ones the adapter changed.</p>
    </VizFrame>
  );
}

const PARTS = [
  { key: 'weights', label: 'weights', fill: 'accent' as const },
  { key: 'gradients', label: 'gradients', fill: 'stripe' as const },
  { key: 'optimizer', label: 'optimizer state', fill: 'warn' as const },
  { key: 'activations', label: 'activations', fill: 'dots' as const },
  { key: 'logits', label: 'logits', fill: 'ink' as const },
];

/** Full fine-tuning, LoRA and QLoRA memory side by side against the GPU's memory. */
export function MemoryView() {
  const { state, result: r } = useExperimentContext<MemoryState, MemoryResult>('MemoryView');
  const names = { full: 'Full fine-tuning', lora: 'LoRA, 16-bit base', qlora: 'QLoRA, 4-bit base' };
  return (
    <div data-fits={r.estimates.filter((e) => e.total <= r.gpuBytes).map((e) => e.method).join(',')}>
      <StackedBars
        title={`Training memory, ${getModel(state.model).label}`}
        badge={<Badge tone="simulated">Estimate</Badge>}
        parts={PARTS}
        rows={r.estimates.map((e) => ({
          label: names[e.method],
          values: e.parts as unknown as Record<string, number>,
          note: e.total <= r.gpuBytes ? 'fits' : 'does not fit',
        }))}
        format={(b) => gb(b)}
        limit={{ value: r.gpuBytes, label: 'GPU memory' }}
        caption={`Sequence length ${state.seqLen}, micro batch ${state.batch}, ${state.checkpointing ? 'with' : 'without'} activation checkpointing. ${r.estimates
          .map((e) => `${names[e.method]}: ${gb(e.total)}`)
          .join('; ')}.`}
      />
    </div>
  );
}
