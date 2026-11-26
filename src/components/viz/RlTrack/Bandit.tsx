import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { movingAverage, type BanditResult } from '@/lib/rl/bandit';
import { BANDIT_ARMS, BANDIT_PROBS, BANDIT_RUNS, type BanditState } from '@/lib/rl/experiments';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './RlTrack.module.css';

/** Keep every k-th point so long curves stay light and their tables stay readable. */
export const thin = (ys: readonly number[], every: number, x0 = 1): [number, number][] =>
  ys.flatMap((y, i) => (i % every === every - 1 || i === 0 ? [[i + x0, y] as [number, number]] : []));

/** Four headlines with unknown click rates: what one run learned, and how all runs did over time. */
export function RlBandit() {
  const { state, result: r } = useExperimentContext<BanditState, BanditResult>('RlBandit');
  const pulls = r.first.counts.reduce((a, b) => a + b, 0);
  return (
    <div className={s.stack}>
      <VizFrame
        title="One run: what the agent believes"
        badge={<Badge tone="simulated">Simulated clicks</Badge>}
        caption={`After ${pulls} pulls the agent's estimates are ${r.first.estimates.map((q, i) => `${BANDIT_ARMS[i]} ${q.toFixed(2)}`).join(', ')}. It pulled the best headline, D, ${r.first.counts[r.best]} times.`}
        table={<VizTable caption="Headlines" columns={['headline', 'true click rate', 'estimate', 'pulls']} rows={BANDIT_PROBS.map((p, i) => [BANDIT_ARMS[i]!, p, r.first.estimates[i]!.toFixed(3), r.first.counts[i]!])} />}
      >
        <ul className={s.list} data-best-pulls={r.first.counts[r.best]}>
          {BANDIT_PROBS.map((p, i) => (
            <li key={i} className={s.hbar} data-arm={BANDIT_ARMS[i]}>
              <span className={s.mono}>
                {BANDIT_ARMS[i]} · true {p.toFixed(2)}
              </span>
              <span className={s.hbarTrack} aria-hidden="true">
                <span className={s.hbarRef} style={{ width: `${p * 100}%` }} />
                <span className={s.hbarNew} style={{ width: `${Math.max(0, Math.min(1, r.first.estimates[i]!)) * 100}%` }} />
              </span>
              <span className={s.tag}>
                est {r.first.estimates[i]!.toFixed(2)} · {r.first.counts[i]} pulls
              </span>
            </li>
          ))}
        </ul>
        <p className={s.muted}>Thin grey bar: the true click rate (hidden from the agent). Thick blue bar: the agent's estimate.</p>
      </VizFrame>
      <LineChart
        title={`${BANDIT_RUNS} runs: how often the best headline is chosen`}
        xLabel="pull"
        yLabel="share of runs"
        yDomain={[0, 1]}
        series={[
          { id: 'optimal', label: '% best headline (moving average of 10)', points: thin(movingAverage(r.optimalShare, 10), 10) },
          { id: 'reward', label: 'reward per pull (moving average of 10)', points: thin(movingAverage(r.avgReward, 10), 10), tone: 'ink', dashed: true },
        ]}
        caption={`Strategy: ${state.strategy === 'epsilon' ? `ε-greedy with ε = ${state.epsilon.toFixed(2)}` : state.strategy === 'ucb' ? `UCB with c = ${state.c.toFixed(1)}` : 'greedy'}. In the last pull, ${Math.round(r.optimalShare.at(-1)! * 100)}% of runs chose headline D.`}
      />
    </div>
  );
}
