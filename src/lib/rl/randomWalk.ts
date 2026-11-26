// The five-state random walk of Sutton and Barto (Example 6.2): states A to E in a row, every episode starts in C,
// each step goes left or right with probability 1/2. Falling off the left end pays 0, off the right end pays 1.
// With no discounting the true value of each state is the chance of finishing on the right: 1/6, 2/6, …, 5/6.
// Monte Carlo and TD(0) both learn these values from episodes; this module runs both on the same episodes.
import { seededRandom } from '../classical/random';

export const WALK_STATES = ['A', 'B', 'C', 'D', 'E'] as const;
export const TRUE_VALUES = [1, 2, 3, 4, 5].map((k) => k / 6);
const START = 2;

/** One episode: the states visited (0..4) and the reward of each step (0 except a final 1 on the right). */
export interface WalkEpisode {
  states: number[];
  rewards: number[];
}

export function walkEpisode(rand: () => number): WalkEpisode {
  const states = [START];
  const rewards: number[] = [];
  let s = START;
  for (;;) {
    s += rand() < 0.5 ? -1 : 1;
    if (s < 0) {
      rewards.push(0);
      return { states, rewards };
    }
    if (s > 4) {
      rewards.push(1);
      return { states, rewards };
    }
    rewards.push(0);
    states.push(s);
  }
}

/** Monte Carlo update after a finished episode: every visited state moves toward the return that followed it. */
export function mcUpdate(V: number[], ep: WalkEpisode, alpha: number): void {
  let g = 0;
  for (let t = ep.states.length - 1; t >= 0; t--) {
    g += ep.rewards[t]!; // γ = 1
    const s = ep.states[t]!;
    V[s]! += alpha * (g - V[s]!);
  }
}

/** TD(0) updates during an episode: each state moves toward reward + value of the next state (0 when the walk ends). */
export function tdUpdate(V: number[], ep: WalkEpisode, alpha: number): void {
  for (let t = 0; t < ep.states.length; t++) {
    const s = ep.states[t]!;
    const next = t + 1 < ep.states.length ? V[ep.states[t + 1]!]! : 0;
    V[s]! += alpha * (ep.rewards[t]! + next - V[s]!);
  }
}

export const rmsError = (V: readonly number[]) =>
  Math.sqrt(V.reduce((s, v, i) => s + (v - TRUE_VALUES[i]!) ** 2, 0) / V.length);

export interface WalkResult {
  /** Root-mean-square error after each episode (index 0 = before any episode), averaged over runs. */
  mcError: number[];
  tdError: number[];
  /** The first run's estimates after the last episode. */
  mcValues: number[];
  tdValues: number[];
  /** The first episode of the first run, for the worked example. */
  firstEpisode: WalkEpisode;
}

export function compareMcTd(opts: { alpha: number; episodes: number; runs: number; seed: number }): WalkResult {
  const mcError = new Array<number>(opts.episodes + 1).fill(0);
  const tdError = new Array<number>(opts.episodes + 1).fill(0);
  let mcValues: number[] = [];
  let tdValues: number[] = [];
  let firstEpisode: WalkEpisode = { states: [], rewards: [] };
  for (let run = 0; run < opts.runs; run++) {
    const rand = seededRandom(opts.seed * 1000 + run);
    const mc = [0.5, 0.5, 0.5, 0.5, 0.5];
    const td = [0.5, 0.5, 0.5, 0.5, 0.5];
    mcError[0]! += rmsError(mc) / opts.runs;
    tdError[0]! += rmsError(td) / opts.runs;
    for (let e = 1; e <= opts.episodes; e++) {
      const ep = walkEpisode(rand); // both methods learn from the very same episode
      if (run === 0 && e === 1) firstEpisode = ep;
      mcUpdate(mc, ep, opts.alpha);
      tdUpdate(td, ep, opts.alpha);
      mcError[e]! += rmsError(mc) / opts.runs;
      tdError[e]! += rmsError(td) / opts.runs;
    }
    if (run === 0) {
      mcValues = mc;
      tdValues = td;
    }
  }
  return { mcError, tdError, mcValues, tdValues, firstEpisode };
}
