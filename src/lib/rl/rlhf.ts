// RL for language models, on a toy with four possible answers so everything can be computed exactly.
//
// RLHF with a KL penalty maximises  E_{y~π}[r(y)] − β · KL(π ‖ π_ref).  For a fixed set of answers the best policy
// has a closed form (it is the starting point of the DPO paper, Rafailov et al. 2023, equation 4):
//   π*(y) = π_ref(y) · exp(r(y)/β) / Z
// Small β trusts the reward model almost completely; large β stays close to the reference model.

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Bradley–Terry: the probability that answer A is preferred over B, given reward scores. */
export const preferProb = (ra: number, rb: number) => sigmoid(ra - rb);

/** Reward model loss on one comparison where `chosen` was preferred: −log σ(r_chosen − r_rejected). */
export const pairLoss = (rChosen: number, rRejected: number) => -Math.log(preferProb(rChosen, rRejected));

export function klOptimalPolicy(ref: readonly number[], rewards: readonly number[], beta: number): number[] {
  const logits = ref.map((p, i) => Math.log(p) + rewards[i]! / beta);
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const z = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / z);
}

/** KL(p ‖ q) = Σ p · log(p/q), in nats: how far the tuned policy has moved from the reference. */
export const klDivergence = (p: readonly number[], q: readonly number[]) =>
  p.reduce((s, pi, i) => (pi > 0 ? s + pi * Math.log(pi / q[i]!) : s), 0);

export const expectation = (p: readonly number[], x: readonly number[]) => p.reduce((s, pi, i) => s + pi * x[i]!, 0);

/** GRPO's group-relative advantage: each sampled answer's reward minus the group mean, over the group's std. */
export function groupAdvantages(rewards: readonly number[]): number[] {
  const n = rewards.length;
  const mean = rewards.reduce((s, r) => s + r, 0) / n;
  const std = Math.sqrt(rewards.reduce((s, r) => s + (r - mean) ** 2, 0) / n);
  return rewards.map((r) => (std === 0 ? 0 : (r - mean) / std));
}

/** DPO loss on one pair: −log σ(β · [(log π(y_w) − log π_ref(y_w)) − (log π(y_l) − log π_ref(y_l))]). */
export function dpoLoss(logpW: number, refW: number, logpL: number, refL: number, beta: number): number {
  return -Math.log(sigmoid(beta * (logpW - refW - (logpL - refL))));
}

/** The toy: four answers to "Explain why the sky is blue" with reference probabilities, scores and true quality. */
export interface ToyAnswer {
  id: string;
  label: string;
  ref: number;
  /** What the (imperfect) reward model says. */
  reward: number;
  /** What careful human raters would say. Unknown to the training loop. */
  quality: number;
}

export const SKY_ANSWERS: ToyAnswer[] = [
  { id: 'terse', label: 'One vague sentence', ref: 0.5, reward: 0.0, quality: 0.0 },
  { id: 'clear', label: 'Clear, correct paragraph', ref: 0.3, reward: 1.0, quality: 1.0 },
  { id: 'thorough', label: 'Correct and thorough', ref: 0.15, reward: 1.5, quality: 1.3 },
  { id: 'hack', label: 'Long, flattering, subtly wrong', ref: 0.05, reward: 2.4, quality: -0.8 },
];
