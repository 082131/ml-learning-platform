// Returns: the number an RL agent tries to make large. G_t = r_{t+1} + γ·r_{t+2} + γ²·r_{t+3} + …

/** Discounted return of a whole reward sequence, counted from its first reward. */
export function discountedReturn(rewards: readonly number[], gamma: number): number {
  let g = 0;
  for (let t = rewards.length - 1; t >= 0; t--) g = rewards[t]! + gamma * g;
  return g;
}

/** G_t for every time step t, computed backwards with G_t = r_{t+1} + γ·G_{t+1}. */
export function returnsPerStep(rewards: readonly number[], gamma: number): number[] {
  const out = new Array<number>(rewards.length);
  let g = 0;
  for (let t = rewards.length - 1; t >= 0; t--) {
    g = rewards[t]! + gamma * g;
    out[t] = g;
  }
  return out;
}

/** What each reward is worth today: γ^t · r. */
export const discountedTerms = (rewards: readonly number[], gamma: number) => rewards.map((r, t) => gamma ** t * r);

/** The "effective horizon" 1/(1−γ): roughly how many steps ahead the agent cares about. Infinity for γ = 1. */
export const horizon = (gamma: number) => (gamma >= 1 ? Infinity : 1 / (1 - gamma));

/**
 * The discount factor at which a reward `small` now and a reward `big` arriving `delay` steps later are worth the
 * same: small = γ^delay · big, so γ = (small/big)^(1/delay).
 */
export const indifferenceGamma = (small: number, big: number, delay: number) => (small / big) ** (1 / delay);
