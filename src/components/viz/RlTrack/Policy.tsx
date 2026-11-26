import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { PG_MEANS, PG_RUNS, type PgCompare, type PgState, type PpoResult, type PpoState, type RlhfResult, type RlhfState } from '@/lib/rl/experiments';
import { SKY_ANSWERS } from '@/lib/rl/rlhf';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import { thin } from './Bandit';
import s from './RlTrack.module.css';

/** REINFORCE with and without a baseline: probability of the best arm over time. */
export function RlPolicyGradient() {
  const { state, result: r } = useExperimentContext<PgState, PgCompare>('RlPolicyGradient');
  return (
    <LineChart
      title={`Probability the policy picks the best arm (average of ${PG_RUNS} runs)`}
      badge={<Badge tone="simulated">Simulated in your browser</Badge>}
      xLabel="step"
      yLabel="π(best arm)"
      yDomain={[0, 1]}
      series={[
        { id: 'baseline', label: 'REINFORCE with a baseline (R − average reward)', points: thin(r.withBaseline.bestProb, 10, 0) },
        { id: 'plain', label: 'plain REINFORCE (R alone)', points: thin(r.without.bestProb, 10, 0), tone: 'ink', dashed: true },
      ]}
      caption={`Arm means ${PG_MEANS.map((m) => (m + state.offset).toFixed(1)).join(', ')} (plus noise). α = ${state.alpha.toFixed(2)}. Both start at 1/3 per arm. After 500 steps: with baseline ${r.withBaseline.bestProb.at(-1)!.toFixed(2)}, without ${r.without.bestProb.at(-1)!.toFixed(2)}.`}
    />
  );
}

/** PPO's clipped objective as a function of the probability ratio, with the current sample marked. */
export function RlPpoClip() {
  const { state, result: r } = useExperimentContext<PpoState, PpoResult>('RlPpoClip');
  const lo = 1 - state.eps;
  const hi = 1 + state.eps;
  return (
    <div data-clipped={r.isClipped} data-value={r.value.toFixed(3)}>
      <LineChart
        title={`PPO objective for one sample with advantage ${state.advantage > 0 ? '+1' : '−1'}`}
        xLabel="ratio π_new(a|s) / π_old(a|s)"
        yLabel="objective"
        xDomain={[0, 2]}
        yDomain={[-2, 2]}
        series={[
          { id: 'clipped', label: 'PPO: min(ratio·A, clip(ratio)·A)', points: r.clipped, inTable: true },
          { id: 'plain', label: 'unclipped: ratio·A', points: r.unclipped, tone: 'ink', dashed: true, inTable: false },
        ]}
        overlay={(x, y) => (
          <g>
            <line x1={x(lo)} x2={x(lo)} y1={y(-2)} y2={y(2)} className={svg.muted} stroke="currentColor" strokeDasharray="2 3" />
            <line x1={x(hi)} x2={x(hi)} y1={y(-2)} y2={y(2)} className={svg.muted} stroke="currentColor" strokeDasharray="2 3" />
            <g className={svg.err}>
              <circle cx={x(state.ratio)} cy={y(r.value)} r={6} fill="currentColor" stroke="none" />
            </g>
          </g>
        )}
        caption={`Dotted lines mark 1 − ε = ${lo.toFixed(2)} and 1 + ε = ${hi.toFixed(2)}. The red dot is this sample: ratio ${state.ratio.toFixed(2)}, objective ${r.value.toFixed(3)}. ${r.isClipped ? 'The curve is flat here, so this sample no longer pushes the policy.' : 'The curve still slopes here, so this sample still pushes the policy.'}`}
      />
    </div>
  );
}

/** RLHF with a KL penalty, solved exactly for four answers: how the tuned policy moves and what it does to true quality. */
export function RlKlPolicy() {
  const { state, result: r } = useExperimentContext<RlhfState, RlhfResult>('RlKlPolicy');
  return (
    <div className={s.stack}>
      <VizFrame
        title={`The best policy for β = ${state.beta.toFixed(2)}`}
        badge={<Badge tone="simulated">Toy numbers</Badge>}
        caption={`Reference model vs tuned policy: ${SKY_ANSWERS.map((a, i) => `${a.label} ${Math.round(a.ref * 100)}% → ${Math.round(r.policy[i]! * 100)}%`).join('; ')}. KL from the reference: ${r.kl.toFixed(3)} nats.`}
        table={<VizTable caption="Answers" columns={['answer', 'reference π_ref', 'reward model score', 'true quality', 'tuned π*']} rows={SKY_ANSWERS.map((a, i) => [a.label, a.ref.toFixed(2), a.reward.toFixed(1), a.quality.toFixed(1), r.policy[i]!.toFixed(3)])} />}
      >
        <ul className={s.list} data-hack={r.policy[3]!.toFixed(3)} data-quality={r.expectedQuality.toFixed(3)}>
          {SKY_ANSWERS.map((a, i) => (
            <li key={a.id} className={s.hbar} data-hack={a.id === 'hack' || undefined}>
              <span className={s.mono}>
                {a.label} (RM {a.reward.toFixed(1)}, true {a.quality.toFixed(1)})
              </span>
              <span className={s.hbarTrack} aria-hidden="true">
                <span className={s.hbarRef} style={{ width: `${a.ref * 100}%` }} />
                <span className={s.hbarNew} style={{ width: `${r.policy[i]! * 100}%` }} />
              </span>
              <span className={s.tag}>{Math.round(r.policy[i]! * 100)}%</span>
            </li>
          ))}
        </ul>
        <p className={s.muted}>Thin grey bar: the reference model's probability. Thick bar: the tuned policy's (red for the reward hack).</p>
      </VizFrame>
      <LineChart
        title="Reward-model score and true quality as β changes"
        xLabel="β"
        yLabel="average over answers"
        xDomain={[0, 5]}
        series={[
          { id: 'rm', label: 'average reward-model score', points: thin(r.rewardCurve.map((p) => p[1]), 4, 0).map(([i, v]) => [r.rewardCurve[i]![0], v] as [number, number]), tone: 'ink', dashed: true },
          { id: 'q', label: 'average true quality', points: thin(r.qualityCurve.map((p) => p[1]), 4, 0).map(([i, v]) => [r.qualityCurve[i]![0], v] as [number, number]) },
        ]}
        overlay={(x, y) => (
          <g className={svg.err}>
            <circle cx={x(state.beta)} cy={y(r.expectedQuality)} r={5} fill="currentColor" stroke="none" />
          </g>
        )}
        caption={`True quality peaks near β = ${r.bestBeta.toFixed(2)}. Below that the policy chases the reward model's blind spot; above it the policy barely moves from the reference (true quality ${r.refQuality.toFixed(3)}). The red dot is the current β.`}
      />
    </div>
  );
}
