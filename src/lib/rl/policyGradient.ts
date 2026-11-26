// Policy gradients on the simplest possible problem: a three-armed bandit with a softmax policy.
// The policy is a list of preferences θ (one per arm); π(a) = exp(θ_a) / Σ_b exp(θ_b).
// REINFORCE: after pulling arm A and getting reward R, move every preference along R times the gradient of log π(A):
//   θ_a ← θ_a + α · (R − b) · (1[a = A] − π(a))
// where b is a baseline (here the running average reward). With b = 0 this is plain REINFORCE. This is the
// gradient bandit algorithm of Sutton and Barto, section 2.8, which they derive as stochastic gradient ascent.
import { normal, seededRandom } from '../classical/random';

export function softmax(prefs: readonly number[]): number[] {
  const m = Math.max(...prefs);
  const e = prefs.map((x) => Math.exp(x - m)); // subtracting the max changes nothing mathematically, avoids overflow
  const z = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / z);
}

/** ∇_θ log π(A) for a softmax policy: 1 − π(a) for the chosen arm, −π(a) for the others. */
export const gradLogPi = (probs: readonly number[], chosen: number) => probs.map((p, a) => (a === chosen ? 1 : 0) - p);

/** One REINFORCE step. Returns the new preferences. */
export function reinforceStep(prefs: readonly number[], chosen: number, reward: number, baseline: number, alpha: number): number[] {
  const g = gradLogPi(softmax(prefs), chosen);
  return prefs.map((th, a) => th + alpha * (reward - baseline) * g[a]!);
}

export function sampleIndex(probs: readonly number[], u: number): number {
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i]!;
    if (u < cum) return i;
  }
  return probs.length - 1;
}

export interface PgConfig {
  /** Mean reward of each arm; each pull adds standard normal noise. */
  means: number[];
  /** Added to every reward. Changes nothing about which arm is best, but a lot about plain REINFORCE. */
  offset: number;
  alpha: number;
  baseline: boolean;
  steps: number;
  runs: number;
  seed: number;
}

export interface PgResult {
  /** Probability the policy gives the best arm at each step, averaged over runs. */
  bestProb: number[];
  /** First run: probabilities of every arm at each step (for the stacked view). */
  firstProbs: number[][];
  best: number;
}

export function runPolicyGradient(cfg: PgConfig): PgResult {
  const k = cfg.means.length;
  const best = cfg.means.indexOf(Math.max(...cfg.means));
  const bestProb = new Array<number>(cfg.steps + 1).fill(0);
  let firstProbs: number[][] = [];
  for (let run = 0; run < cfg.runs; run++) {
    const rand = seededRandom(cfg.seed * 1000 + run);
    let prefs = new Array<number>(k).fill(0);
    let avg = 0;
    const trail = [softmax(prefs)];
    bestProb[0]! += trail[0]![best]! / cfg.runs;
    for (let t = 1; t <= cfg.steps; t++) {
      const probs = softmax(prefs);
      const a = sampleIndex(probs, rand());
      const reward = cfg.means[a]! + cfg.offset + normal(rand);
      const b = cfg.baseline ? avg : 0;
      prefs = reinforceStep(prefs, a, reward, b, cfg.alpha);
      avg += (reward - avg) / t; // the baseline is updated after it is used, so it never includes this reward
      const now = softmax(prefs);
      bestProb[t]! += now[best]! / cfg.runs;
      if (run === 0) trail.push(now);
    }
    if (run === 0) firstProbs = trail;
  }
  return { bestProb, firstProbs, best };
}
