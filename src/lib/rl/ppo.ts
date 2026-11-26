// Pieces of deep RL that are plain arithmetic: the DQN target, the actor-critic advantage, and PPO's clipped
// surrogate objective (Schulman et al., 2017, "Proximal Policy Optimization Algorithms", equation 7).

/** DQN target for one transition: r if the episode ended, else r + γ · max_a' Q_target(s', a'). */
export const dqnTarget = (reward: number, nextQ: readonly number[], gamma: number, done: boolean) =>
  done ? reward : reward + gamma * Math.max(...nextQ);

/** One-step advantage estimate (the TD error): how much better the outcome was than the critic expected. */
export const tdAdvantage = (reward: number, vNow: number, vNext: number, gamma: number, done: boolean) =>
  reward + (done ? 0 : gamma * vNext) - vNow;

export const clip = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * PPO's per-sample objective (to maximise): min(ratio · A, clip(ratio, 1−ε, 1+ε) · A), where ratio = π_new(a|s) / π_old(a|s).
 */
export const ppoObjective = (ratio: number, advantage: number, eps: number) =>
  Math.min(ratio * advantage, clip(ratio, 1 - eps, 1 + eps) * advantage);

/** Whether the clip is active, i.e. the objective is flat in the ratio, so this sample gives zero gradient. */
export function ppoClipped(ratio: number, advantage: number, eps: number): boolean {
  if (advantage > 0) return ratio > 1 + eps;
  if (advantage < 0) return ratio < 1 - eps;
  return false;
}

/** Points of the objective as the ratio goes from lo to hi, for the chart. */
export function ppoCurve(advantage: number, eps: number, lo = 0, hi = 2, n = 81): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const r = lo + ((hi - lo) * i) / (n - 1);
    return [r, ppoObjective(r, advantage, eps)];
  });
}

/** The unclipped policy-gradient objective ratio · A, for comparison. */
export const unclippedCurve = (advantage: number, lo = 0, hi = 2, n = 81): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const r = lo + ((hi - lo) * i) / (n - 1);
    return [r, r * advantage];
  });
