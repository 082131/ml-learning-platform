// Learning to act from experience: Q-learning (off-policy) and SARSA (on-policy) with ε-greedy exploration.
//   Q-learning target: r + γ · max_a' Q(s', a')        (the best next action, whatever the agent does next)
//   SARSA target:      r + γ · Q(s', a')  with a' the action the agent actually takes next
// The agent never sees the transition table; it only samples outcomes from it, like a robot trying moves.
import { seededRandom } from '../classical/random';
import { ACTIONS, isActive, sampleOutcome, type Action, type Grid } from './grid';
import { argmaxRandomTie } from './bandit';

export type ControlAlgo = 'q-learning' | 'sarsa';

export interface ControlConfig {
  algo: ControlAlgo;
  alpha: number;
  gamma: number;
  epsilon: number;
  episodes: number;
  /** Episodes are cut off after this many steps (an agent can wander for a long time early on). */
  maxSteps: number;
  runs: number;
  seed: number;
}

export interface ControlResult {
  /** Sum of rewards in each episode, averaged over runs: what the agent actually earned while learning. */
  episodeReturns: number[];
  /** Steps per episode, averaged over runs. */
  episodeSteps: number[];
  /** The first run's Q table after the last episode: Q[s][a]. */
  Q: number[][];
  /** The first run's greedy action per cell (undefined for walls and terminal cells). */
  greedy: (Action | undefined)[];
  /** The path the greedy policy takes from the start, ignoring slips, and whether it reaches a terminal cell. */
  path: number[];
  reaches: 'goal' | 'pit' | 'loops';
}

export function epsilonGreedy(q: readonly number[], epsilon: number, rand: () => number): number {
  if (rand() < epsilon) return Math.floor(rand() * q.length);
  return argmaxRandomTie(q, rand());
}

/** The update both algorithms share: move Q(s,a) a fraction α of the way toward the target. */
export const tdStep = (q: number, target: number, alpha: number) => q + alpha * (target - q);

export function runControl(g: Grid, cfg: ControlConfig): ControlResult {
  const episodeReturns = new Array<number>(cfg.episodes).fill(0);
  const episodeSteps = new Array<number>(cfg.episodes).fill(0);
  let firstQ: number[][] = [];
  for (let run = 0; run < cfg.runs; run++) {
    const rand = seededRandom(cfg.seed * 1000 + run);
    const Q = g.kinds.map(() => ACTIONS.map(() => 0));
    for (let ep = 0; ep < cfg.episodes; ep++) {
      let s = g.start;
      let a = epsilonGreedy(Q[s]!, cfg.epsilon, rand);
      let total = 0;
      let steps = 0;
      while (steps < cfg.maxSteps) {
        const o = sampleOutcome(g.transitions[s]![a]!, rand());
        total += o.reward;
        steps++;
        if (o.done) {
          Q[s]![a] = tdStep(Q[s]![a]!, o.reward, cfg.alpha);
          break;
        }
        const a2 = epsilonGreedy(Q[o.next]!, cfg.epsilon, rand);
        const nextQ = cfg.algo === 'q-learning' ? Math.max(...Q[o.next]!) : Q[o.next]![a2]!;
        Q[s]![a] = tdStep(Q[s]![a]!, o.reward + cfg.gamma * nextQ, cfg.alpha);
        s = o.next;
        a = a2;
      }
      episodeReturns[ep]! += total / cfg.runs;
      episodeSteps[ep]! += steps / cfg.runs;
    }
    if (run === 0) firstQ = Q;
  }
  const greedy = greedyFromQ(g, firstQ);
  const { path, reaches } = greedyPath(g, greedy);
  return { episodeReturns, episodeSteps, Q: firstQ, greedy, path, reaches };
}

/** Greedy action per active cell; ties go to the first action in ACTIONS order so the picture is stable. */
export function greedyFromQ(g: Grid, Q: readonly (readonly number[])[]): (Action | undefined)[] {
  return g.kinds.map((_, s) => {
    if (!isActive(g, s) || g.kinds[s] === 'cliff') return undefined;
    const q = Q[s]!;
    return ACTIONS[q.indexOf(Math.max(...q))];
  });
}

/** Follow the greedy actions from the start along the intended direction (no slips) until a terminal or a repeat. */
export function greedyPath(g: Grid, greedy: readonly (Action | undefined)[]): { path: number[]; reaches: ControlResult['reaches'] } {
  const path = [g.start];
  const seen = new Set(path);
  let s = g.start;
  for (;;) {
    const a = greedy[s];
    if (!a) return { path, reaches: 'loops' };
    const intended = g.transitions[s]![ACTIONS.indexOf(a)]!.reduce((best, o) => (o.p > best.p ? o : best));
    s = intended.next;
    path.push(s);
    if (g.kinds[s] === 'goal') return { path, reaches: 'goal' };
    if (g.kinds[s] === 'pit') return { path, reaches: 'pit' };
    if (seen.has(s)) return { path, reaches: 'loops' };
    seen.add(s);
  }
}
