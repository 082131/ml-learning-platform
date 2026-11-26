import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { cellName, isActive } from '@/lib/rl/grid';
import { CLIFF_RUNS, Q_RUNS, WALK_RUNS, type CliffResult, type CliffState, type QResult, type QState, type WalkState } from '@/lib/rl/experiments';
import { TRUE_VALUES, WALK_STATES, type WalkResult } from '@/lib/rl/randomWalk';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { thin } from './Bandit';
import { Board, fmtValue } from './Board';
import s from './RlTrack.module.css';

const sim = <Badge tone="simulated">Simulated in your browser</Badge>;

/** Monte Carlo and TD(0) learning the random walk's values from the same episodes. */
export function RlWalk() {
  const { state, result: r } = useExperimentContext<WalkState, WalkResult>('RlWalk');
  const pts = (ys: number[]) => ys.slice(0, state.episodes + 1).map((y, i) => [i, y] as [number, number]);
  return (
    <div className={s.stack}>
      <LineChart
        title={`Error of the value estimates, averaged over ${WALK_RUNS} runs`}
        badge={sim}
        xLabel="episodes seen"
        yLabel="RMS error"
        yDomain={[0, 0.3]}
        series={[
          { id: 'mc', label: 'Monte Carlo (waits for the end of the episode)', points: thin(pts(r.mcError).map((p) => p[1]), Math.max(1, Math.round(state.episodes / 50)), 0), tone: 'ink', dashed: true },
          { id: 'td', label: 'TD(0) (updates after every step)', points: thin(pts(r.tdError).map((p) => p[1]), Math.max(1, Math.round(state.episodes / 50)), 0) },
        ]}
        caption={`α = ${state.alpha.toFixed(2)}. After ${state.episodes} episodes: Monte Carlo ${r.mcError[state.episodes]!.toFixed(3)}, TD(0) ${r.tdError[state.episodes]!.toFixed(3)}. Both start from 0.5 everywhere (error 0.236).`}
      />
      <VizFrame
        title="One run's estimates after the last episode"
        caption={`True values are 1/6 to 5/6. TD(0): ${r.tdValues.map((v) => v.toFixed(2)).join(', ')}. Monte Carlo: ${r.mcValues.map((v) => v.toFixed(2)).join(', ')}.`}
        table={<VizTable caption="Estimates" columns={['state', 'true value', 'Monte Carlo', 'TD(0)']} rows={WALK_STATES.map((n, i) => [n, TRUE_VALUES[i]!.toFixed(3), r.mcValues[i]!.toFixed(3), r.tdValues[i]!.toFixed(3)])} />}
      >
        <ul className={s.list} data-td={r.tdError[state.episodes]!.toFixed(3)} data-mc={r.mcError[state.episodes]!.toFixed(3)}>
          {WALK_STATES.map((n, i) => (
            <li key={n} className={s.hbar}>
              <span className={s.mono}>
                {n} · true {TRUE_VALUES[i]!.toFixed(2)}
              </span>
              <span className={s.hbarTrack} aria-hidden="true">
                <span className={s.hbarRef} style={{ width: `${TRUE_VALUES[i]! * 100}%` }} />
                <span className={s.hbarNew} style={{ width: `${Math.min(1, Math.max(0, r.tdValues[i]!)) * 100}%` }} />
              </span>
              <span className={s.tag}>
                TD {r.tdValues[i]!.toFixed(2)} · MC {r.mcValues[i]!.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <p className={s.muted}>Thin grey bar: the true value. Thick blue bar: the TD(0) estimate.</p>
      </VizFrame>
    </div>
  );
}

/** What Q-learning learned on the grid: max Q per cell, greedy arrows (red where they differ from optimal), and the learning curve. */
export function RlQGrid() {
  const { state, result: r } = useExperimentContext<QState, QResult>('RlQGrid');
  const maxQ = r.Q.map((row, i) => (isActive(r.grid, i) ? Math.max(...row) : 0));
  const mismatch = r.greedy.map((a, i) => a !== undefined && !r.matches[i]);
  const every = Math.max(1, Math.round(state.episodes / 60));
  return (
    <div className={s.stack}>
      <VizFrame
        title={`After ${state.episodes} episodes of Q-learning`}
        badge={sim}
        caption={`Arrows show the action with the highest Q in each cell; numbers are that highest Q, the agent's estimate of the cell's value. ${r.agree} of ${r.cells} arrows match the optimal policy from value iteration. The greedy route from the start ${r.reaches === 'goal' ? `reaches the goal in ${r.path.length - 1} moves` : r.reaches === 'pit' ? 'ends in the pit' : 'goes in circles'}.`}
        table={<VizTable caption="Learned Q values" columns={['cell', 'Q up', 'Q right', 'Q down', 'Q left', 'greedy', 'optimal']} rows={r.grid.kinds.flatMap((_, i) => (isActive(r.grid, i) ? [[cellName(r.grid, i), ...r.Q[i]!.map((q) => fmtValue(q)), r.greedy[i] ?? '', r.optimal[i] ?? '']] : []))} />}
      >
        <div data-agree={r.agree} data-reaches={r.reaches}>
          <Board grid={r.grid} values={maxQ} arrows={r.greedy} mismatch={mismatch} path={r.path} />
        </div>
      </VizFrame>
      <LineChart
        title={`Reward per episode while learning (average of ${Q_RUNS} runs, smoothed)`}
        xLabel="episode"
        yLabel="sum of rewards"
        series={[{ id: 'ret', label: 'reward per episode (moving average of 20)', points: thin(r.smoothed, every) }]}
        caption={`The curve includes exploration: with ε = ${state.epsilon.toFixed(2)} some moves are random, so even a perfect Q table earns a bit less than the optimal 0.705 per episode.`}
      />
    </div>
  );
}

/** SARSA and Q-learning on the cliff: which route each learns, and what each earns while it still explores. */
export function RlCliff() {
  const { state, result: r } = useExperimentContext<CliffState, CliffResult>('RlCliff');
  const every = Math.max(1, Math.round(state.episodes / 60));
  return (
    <div className={s.stack}>
      <VizFrame
        title="The routes each algorithm learned"
        badge={sim}
        caption={`Solid circles: Q-learning's greedy route (${r.q.reaches === 'goal' ? `${r.q.path.length - 1} moves` : 'no route yet'}). Dashed circles: SARSA's (${r.sarsa.reaches === 'goal' ? `${r.sarsa.path.length - 1} moves` : 'no route yet'}). The bottom row between start and goal is the cliff: stepping on it costs −100 and sends you back to the start.`}
        table={<VizTable caption="Greedy routes" columns={['algorithm', 'moves', 'cells']} rows={[['Q-learning', r.q.path.length - 1, r.q.path.map((c) => cellName(r.grid, c)).join(' ')], ['SARSA', r.sarsa.path.length - 1, r.sarsa.path.map((c) => cellName(r.grid, c)).join(' ')]]} />}
      >
        <div data-q-moves={r.q.path.length - 1} data-sarsa-moves={r.sarsa.path.length - 1}>
          <Board grid={r.grid} path={r.q.path} path2={r.sarsa.path} compact />
        </div>
      </VizFrame>
      <LineChart
        title={`Reward per episode while learning (average of ${CLIFF_RUNS} runs, smoothed)`}
        xLabel="episode"
        yLabel="sum of rewards"
        yDomain={[-120, 0]}
        series={[
          { id: 'sarsa', label: 'SARSA (on-policy)', points: thin(r.sarsaSmooth, every) },
          { id: 'q', label: 'Q-learning (off-policy)', points: thin(r.qSmooth, every), tone: 'ink', dashed: true },
        ]}
        caption={`Exploration ε = ${state.epsilon.toFixed(2)}. Q-learning learns the shortest route but its random moves sometimes fall off the cliff; SARSA learns that its own random moves are dangerous and keeps its distance.`}
      />
    </div>
  );
}
