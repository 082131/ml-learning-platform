import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { PaybackInput, PaybackResult, DecideInput, Recommendation } from '@/lib/finetune/decide';
import { LOSS_CONTEXT, LOSS_TOKENS, type LossState } from '@/lib/finetune/experiments';
import type { SequenceLoss } from '@/lib/finetune/loss';
import { human, sci, type ComputeInput, type ComputeResult } from '@/lib/finetune/scaling';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

const MAX_LOSS = 5;

/** Each predicted token: the probability the model gave the right answer, and the loss −ln p that follows. */
export function TokenLossView() {
  const { state, result: r } = useExperimentContext<LossState, SequenceLoss>('TokenLossView');
  return (
    <VizFrame
      title="Loss, token by token"
      caption={`Average loss ${r.mean.toFixed(3)}, perplexity ${r.perplexity.toFixed(2)}: on average the model is as unsure as if it picked from about ${Math.max(1, Math.round(r.perplexity))} equally likely tokens.`}
      table={
        <VizTable
          caption="Per-token loss"
          columns={['context', 'next token', 'P(correct)', 'loss −ln p']}
          rows={LOSS_TOKENS.map((t, i) => [[LOSS_CONTEXT, ...LOSS_TOKENS.slice(0, i)].join(' '), t, state.probs[i]!.toFixed(2), r.losses[i]!.toFixed(3)])}
        />
      }
    >
      <ul className={s.bars} data-mean={r.mean.toFixed(3)} data-ppl={r.perplexity.toFixed(2)}>
        {LOSS_TOKENS.map((t, i) => (
          <li key={t} className={s.bar}>
            <span className={s.barLabel} title={`after "${[LOSS_CONTEXT, ...LOSS_TOKENS.slice(0, i)].join(' ')}"`}>
              → <code className={s.mono}>{t}</code>
            </span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone={r.losses[i]! > 2.5 ? 'err' : undefined} style={{ width: `${Math.min(100, (r.losses[i]! / MAX_LOSS) * 100)}%` }} />
            </span>
            <span className={s.barValue}>
              p {state.probs[i]!.toFixed(2)} · loss {r.losses[i]!.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>
        Bars show the loss −ln p (scale 0 to {MAX_LOSS}). Striped bars are tokens the model found surprising (loss above 2.5, p below 0.08).
      </p>
    </VizFrame>
  );
}

/** The recommendation and its reasons. */
export function DecisionView() {
  const { result: r } = useExperimentContext<DecideInput, Recommendation>('DecisionView');
  return (
    <VizFrame title="Prompt, retrieve or fine-tune?" caption={`${r.label}. ${r.reasons[0]}`}>
      <div className={s.panel} data-approach={r.approach}>
        <p className={s.verdict}>{r.label}</p>
        <ol className={s.list}>
          {r.reasons.map((why) => (
            <li key={why} className={s.muted}>
              {why}
            </li>
          ))}
        </ol>
      </div>
    </VizFrame>
  );
}

/** Months of savings stacked against the one-time cost. */
export function PaybackView() {
  const { result: r } = useExperimentContext<PaybackInput, PaybackResult>('PaybackView');
  const months = Array.from({ length: 12 }, (_, k) => k + 1);
  const top = Math.max(r.oneTime, r.savedPerMonth * 12, 1);
  return (
    <VizFrame
      title="When does a fine-tune pay for itself?"
      badge={<Badge tone="simulated">Estimate, example prices</Badge>}
      caption={r.paybackMonths === null ? 'Nothing is saved per request, so the fine-tune never pays back on cost alone.' : `Savings of $${r.savedPerMonth.toFixed(0)} a month repay $${r.oneTime.toFixed(0)} after ${r.paybackMonths.toFixed(1)} months.`}
      table={<VizTable caption="Cumulative savings" columns={['month', 'saved so far ($)', 'one-time cost ($)']} rows={months.map((m) => [m, Math.round(m * r.savedPerMonth), Math.round(r.oneTime)])} />}
    >
      <ul className={s.bars} data-payback={r.paybackMonths === null ? 'never' : r.paybackMonths.toFixed(1)}>
        {months.map((m) => (
          <li key={m} className={s.bar}>
            <span className={s.barLabel}>month {m}</span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone={m * r.savedPerMonth < r.oneTime ? 'muted' : undefined} style={{ width: `${Math.min(100, ((m * r.savedPerMonth) / top) * 100)}%` }} />
              <span className={s.barMarker} style={{ left: `${(r.oneTime / top) * 100}%` }} />
            </span>
            <span className={s.barValue}>{m * r.savedPerMonth >= r.oneTime ? 'paid back' : 'not yet'}</span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>The dark line is the one-time cost. Grey bars have not reached it yet.</p>
    </VizFrame>
  );
}

/** Tokens per parameter against the compute-optimal 20, with well-known models for scale. */
export function ComputeView() {
  const { state, result: r } = useExperimentContext<ComputeInput, ComputeResult>('ComputeView');
  const refs = [
    { label: 'Chinchilla 70B (1.4T tokens)', tpp: 20 },
    { label: 'Llama 3 8B (15T tokens)', tpp: 15e12 / 8e9 },
    { label: `Your run (${state.paramsB}B, ${human(state.tokensB * 1e9)} tokens)`, tpp: r.tokensPerParam },
  ];
  const max = Math.log10(4000);
  const w = (tpp: number) => `${Math.max(2, (Math.log10(Math.max(1, tpp)) / max) * 100)}%`;
  return (
    <VizFrame
      title="Tokens per parameter"
      badge={<Badge tone="simulated">Estimate</Badge>}
      caption={`${sci(r.flops)} FLOPs, about ${human(r.gpuHours)} GPU-hours, ${r.days.toFixed(1)} days on ${state.gpus} GPUs. ${r.tokensPerParam < 20 ? 'Fewer than 20 tokens per parameter: the model is undertrained for its size.' : 'At least 20 tokens per parameter: past the compute-optimal point, which makes a smaller model that is cheaper to serve.'}`}
      table={<VizTable caption="Tokens per parameter" columns={['run', 'tokens per parameter']} rows={refs.map((x) => [x.label, Math.round(x.tpp)])} />}
    >
      <ul className={s.bars} data-tpp={Math.round(r.tokensPerParam)}>
        {refs.map((x) => (
          <li key={x.label} className={s.bar}>
            <span className={s.barLabel} title={x.label}>
              {x.label}
            </span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone={x.tpp < 20 ? 'err' : undefined} style={{ width: w(x.tpp) }} />
              <span className={s.barMarker} style={{ left: w(20) }} />
            </span>
            <span className={s.barValue}>{Math.round(x.tpp)}</span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>Log scale. The dark line marks 20 tokens per parameter, the compute-optimal ratio from the Chinchilla paper.</p>
    </VizFrame>
  );
}
