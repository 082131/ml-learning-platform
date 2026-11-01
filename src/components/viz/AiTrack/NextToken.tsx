import type { NextTokenResult, NextTokenState } from '@/lib/ai/nextToken';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AiTrack.module.css';

const SHOWN = 12;
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

/** The next-word distribution after the first word: counts → logits → softmax(logits / T) → top-p. */
export function NextTokenBars() {
  const { state, result } = useExperimentContext<NextTokenState, NextTokenResult>('NextTokenBars');
  const shown = result.first.slice(0, SHOWN);
  const kept = result.first.filter((c) => c.kept).length;
  return (
    <VizFrame
      title={`What comes after “${state.start}”`}
      badge={<Badge tone="ok">Computed in your browser</Badge>}
      caption={`${result.first.length} different words follow “${state.start}” in the help center. At temperature ${state.temperature} and top-p ${state.topP.toFixed(2)}, ${kept} of them can be sampled; dashed bars are cut by top-p.${result.first.length > SHOWN ? ` The ${SHOWN} most likely are shown.` : ''}`}
      table={
        <VizTable
          caption="Next-word candidates"
          columns={['word', 'count', 'logit = ln(count)', 'softmax(logit / T)', 'top-p', 'sampled with']}
          rows={result.first.map((c) => [
            c.token,
            c.count,
            c.logit.toFixed(3),
            pct(c.prob),
            c.kept ? 'kept' : 'cut',
            pct(c.sampleProb),
          ])}
        />
      }
    >
      <div className={s.bars}>
        {shown.map((c) => (
          <div key={c.token} style={{ display: 'contents' }} data-token={c.token}>
            <span>{c.token}</span>
            <span className={s.track} aria-hidden="true">
              <span className={s.fill} data-cut={c.kept ? undefined : ''} style={{ width: pct(c.prob) }} />
            </span>
            <span>
              {pct(c.prob)}
              {!c.kept && ' cut'}
            </span>
          </div>
        ))}
      </div>
    </VizFrame>
  );
}

/** The generated sequence, each word with the probability it was sampled with. */
export function GeneratedText() {
  const { state, result } = useExperimentContext<NextTokenState, NextTokenResult>('GeneratedText');
  return (
    <VizFrame
      title="Generated, one word at a time"
      badge={<Badge tone="ok">Sampled in your browser (seed {state.seed})</Badge>}
      caption={`“${result.text}”. Each step looked only at the previous word and drew from its distribution.`}
    >
      <ol className={s.tokens} aria-label="Generated words" data-generated={result.text}>
        <li className={s.token} data-start="">
          {state.start}
          <small>given</small>
        </li>
        {result.steps.map((st, i) => (
          <li key={i} className={s.token}>
            {st.token}
            <small>
              {pct(st.prob)} of {st.choices}
            </small>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}
