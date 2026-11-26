// Multi-armed bandits: one state, several actions ("arms"), each paying 1 with its own unknown probability.
// Strategies: greedy, ε-greedy and UCB1. Estimates are sample averages kept with the incremental update
//   Q ← Q + (1/n)·(reward − Q),
// the same "move the estimate a step toward the target" shape that TD learning and Q-learning use later.
import { seededRandom } from '../classical/random';

export type BanditStrategy = 'greedy' | 'epsilon' | 'ucb';

export interface BanditConfig {
  /** Probability that each arm pays 1. */
  probs: number[];
  strategy: BanditStrategy;
  epsilon: number;
  /** UCB exploration strength c in Q + c·sqrt(ln t / n). */
  c: number;
  /** Starting estimate for every arm (a high value is "optimistic" and forces early exploration). */
  initial: number;
  steps: number;
  runs: number;
  seed: number;
}

export interface BanditRun {
  estimates: number[];
  counts: number[];
  total: number;
}

export interface BanditResult {
  /** Average reward at each step, over all runs. */
  avgReward: number[];
  /** Share of runs that pulled the best arm at each step. */
  optimalShare: number[];
  /** The first run in detail. */
  first: BanditRun;
  /** Mean total reward per run, and the regret against always pulling the best arm. */
  meanTotal: number;
  regret: number;
  best: number;
}

/** Index of the largest value; ties broken by the random number u (so no arm is favoured by position). */
export function argmaxRandomTie(values: readonly number[], u: number): number {
  const best = Math.max(...values);
  const ties = values.flatMap((v, i) => (v === best ? [i] : []));
  return ties[Math.min(ties.length - 1, Math.floor(u * ties.length))]!;
}

/** UCB1 score. An arm never pulled scores +Infinity, so each arm is tried once first. */
export const ucbScore = (q: number, n: number, t: number, c: number) => (n === 0 ? Infinity : q + c * Math.sqrt(Math.log(t) / n));

export function chooseArm(cfg: BanditConfig, q: readonly number[], n: readonly number[], t: number, rand: () => number): number {
  if (cfg.strategy === 'epsilon' && rand() < cfg.epsilon) return Math.floor(rand() * q.length);
  if (cfg.strategy === 'ucb') return argmaxRandomTie(q.map((x, i) => ucbScore(x, n[i]!, t, cfg.c)), rand());
  return argmaxRandomTie(q, rand());
}

export function runBandit(cfg: BanditConfig): BanditResult {
  const k = cfg.probs.length;
  const best = cfg.probs.indexOf(Math.max(...cfg.probs));
  const avgReward = new Array<number>(cfg.steps).fill(0);
  const optimalShare = new Array<number>(cfg.steps).fill(0);
  let first: BanditRun = { estimates: [], counts: [], total: 0 };
  let sumTotal = 0;
  for (let run = 0; run < cfg.runs; run++) {
    const rand = seededRandom(cfg.seed * 1000 + run);
    const q = new Array<number>(k).fill(cfg.initial);
    const n = new Array<number>(k).fill(0);
    let total = 0;
    for (let t = 1; t <= cfg.steps; t++) {
      const a = chooseArm(cfg, q, n, t, rand);
      const reward = rand() < cfg.probs[a]! ? 1 : 0;
      n[a]!++;
      q[a]! += (reward - q[a]!) / n[a]!;
      total += reward;
      avgReward[t - 1]! += reward / cfg.runs;
      if (a === best) optimalShare[t - 1]! += 1 / cfg.runs;
    }
    sumTotal += total;
    if (run === 0) first = { estimates: q, counts: n, total };
  }
  const meanTotal = sumTotal / cfg.runs;
  return { avgReward, optimalShare, first, meanTotal, regret: cfg.probs[best]! * cfg.steps - meanTotal, best };
}

/** Moving average over a window, for smoother learning curves (the first points average what exists so far). */
export function movingAverage(xs: readonly number[], window: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += xs[i]!;
    if (i >= window) sum -= xs[i - window]!;
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}
