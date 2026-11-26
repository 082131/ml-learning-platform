import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { DPO_PAIRS, KL_RESPONSES, type BtState, type DpoTrainState, type KlResult, type KlState } from '@/lib/finetune/experiments';
import { sigmoid, type DpoInput, type DpoResult, type DpoStep, type PairScore } from '@/lib/finetune/preference';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

const curve = (f: (x: number) => number) => Array.from({ length: 81 }, (_, k) => -8 + k * 0.2).map((x) => [x, f(x)] as const);

/** σ(difference) with the current pair marked. */
export function PreferenceView() {
  const { state, result: r } = useExperimentContext<BtState, PairScore>('PreferenceView');
  const d = state.chosen - state.rejected;
  return (
    <div data-prob={r.prob.toFixed(3)} data-loss={r.loss.toFixed(3)}>
      <LineChart
        title="From a reward difference to a preference"
        xLabel="r(chosen) − r(rejected)"
        yLabel="value"
        xDomain={[-8, 8]}
        yDomain={[0, 4]}
        series={[
          { id: 'p', label: 'P(chosen preferred) = σ(difference)', points: curve(sigmoid), tone: 'accent' },
          { id: 'loss', label: 'loss −ln σ(difference)', points: curve((x) => Math.min(4, -Math.log(sigmoid(x)))), tone: 'err', dashed: true },
        ]}
        overlay={(x, y) => (
          <g>
            <circle cx={x(d)} cy={y(r.prob)} r={5} fill="currentColor" />
            <circle cx={x(d)} cy={y(Math.min(4, r.loss))} r={5} fill="none" stroke="currentColor" strokeWidth={2} />
          </g>
        )}
        caption={`Difference ${d.toFixed(1)}: the model says the chosen answer wins with probability ${r.prob.toFixed(3)}, and this pair costs ${r.loss.toFixed(3)} in loss. ${d < 0 ? 'The reward model ranks the pair the wrong way round, so the loss is large.' : ''}`}
      />
    </div>
  );
}

/** Reference policy versus the KL-optimal policy for the chosen β, with reward-model score and true quality. */
export function KlPolicyView() {
  const { state, result: r } = useExperimentContext<KlState, KlResult>('KlPolicyView');
  return (
    <VizFrame
      title="How far does RLHF move the model?"
      badge={<Badge tone="simulated">Toy: 4 answers</Badge>}
      caption={`β = ${state.beta}: KL ${r.kl.toFixed(2)} nats from the SFT model. Reward-model score ${r.expectedReward.toFixed(2)}, true quality ${r.quality.toFixed(2)} (SFT model: ${r.refQuality.toFixed(2)}).`}
      table={<VizTable caption="Policies" columns={['answer', 'reward model', 'true quality', 'P before (SFT)', 'P after']} rows={KL_RESPONSES.map((x, i) => [`${x.id}: ${x.label}`, x.reward, x.quality, x.ref, r.policy[i]!.toFixed(3)])} />}
    >
      <ul className={s.probs} data-policy={r.policy.map((p) => p.toFixed(3)).join(',')}>
        {KL_RESPONSES.map((x, i) => (
          <li key={x.id} className={s.probCol}>
            <div className={s.probTrack} aria-hidden="true">
              <span className={s.probRef} style={{ height: `${x.ref * 100}%` }} />
              <span className={s.probNew} style={{ height: `${r.policy[i]! * 100}%` }} />
            </div>
            <strong>
              {x.id}: {r.policy[i]!.toFixed(2)}
            </strong>
            <span className={s.muted}>{x.label}</span>
            <span className={s.muted}>
              reward {x.reward}, quality {x.quality}
            </span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>Grey: probability under the SFT model. Blue: after optimizing reward − β·KL.</p>
    </VizFrame>
  );
}

/** The four log-probabilities, the two implicit rewards and the margin. */
export function DpoMarginView() {
  const { state, result: r } = useExperimentContext<DpoInput, DpoResult>('DpoMarginView');
  const rows = [
    { label: 'chosen', policy: state.policyChosen, ref: state.refChosen, reward: r.rewardChosen },
    { label: 'rejected', policy: state.policyRejected, ref: state.refRejected, reward: r.rewardRejected },
  ];
  return (
    <VizFrame
      title="DPO on one pair"
      caption={`Margin ${r.margin.toFixed(2)} → loss ${r.loss.toFixed(3)}. ${r.margin > 0 ? 'The policy already favours the chosen answer more than the reference does.' : 'The policy does not yet favour the chosen answer more than the reference does, so this pair pulls hard.'}`}
      table={<VizTable caption="Implicit rewards" columns={['answer', 'log π', 'log π_ref', 'β · difference']} rows={rows.map((x) => [x.label, x.policy, x.ref, x.reward.toFixed(2)])} />}
    >
      <ol className={s.list} data-margin={r.margin.toFixed(2)} data-dpo-loss={r.loss.toFixed(3)}>
        {rows.map((x) => (
          <li key={x.label} className={s.row}>
            <span>
              {x.label}: β · (log π − log π_ref) = {state.beta} · ({x.policy} − ({x.ref}))
            </span>
            <span className={s.mono}>{x.reward.toFixed(2)}</span>
          </li>
        ))}
        <li className={s.row}>
          <span>margin = reward(chosen) − reward(rejected)</span>
          <span className={s.mono}>{r.margin.toFixed(2)}</span>
        </li>
        <li className={s.row}>
          <span>loss = −ln σ(margin)</span>
          <span className={s.mono}>{r.loss.toFixed(3)}</span>
        </li>
        <li className={s.row}>
          <span>gradient weight = σ(−margin)</span>
          <span className={s.mono}>{r.weight.toFixed(3)}</span>
        </li>
      </ol>
    </VizFrame>
  );
}

/** Probabilities of the four toy answers during DPO training. */
export function DpoTrainView() {
  const { state, result: run } = useExperimentContext<DpoTrainState, DpoStep[]>('DpoTrainView');
  const last = run[run.length - 1];
  const tones = ['accent', 'ok', 'err', 'muted'] as const;
  return (
    <div data-final={last!.probs.map((p) => p.toFixed(3)).join(',')} data-steps={state.steps}>
      <LineChart
        title="Answer probabilities during DPO"
        badge={<Badge tone="simulated">Toy: 4 answers</Badge>}
        xLabel="step"
        yLabel="probability"
        xDomain={[0, Math.max(1, state.steps)]}
        yDomain={[0, 1]}
        series={KL_RESPONSES.map((x, i) => ({ id: x.id, label: `${x.id}: ${x.label}`, points: run.map((st) => [st.step, st.probs[i]!] as const), tone: tones[i], dashed: i === 3 }))}
        caption={`β = ${state.beta}, ${DPO_PAIRS.length} human preference pairs, ${state.steps} steps: A ${last!.probs[0]!.toFixed(2)}, B ${last!.probs[1]!.toFixed(2)}, C ${last!.probs[2]!.toFixed(2)}, D ${last!.probs[3]!.toFixed(2)}. Mean loss ${last!.loss.toFixed(3)} (start ${run[0]!.loss.toFixed(3)}).`}
      />
    </div>
  );
}
