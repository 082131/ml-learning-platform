// Preference learning: the Bradley-Terry model behind reward models, the KL-regularized objective of RLHF and its
// closed-form optimum, and the DPO loss that follows from it (Rafailov et al. 2023). Unit-tested in finetune.test.ts.

export const sigmoid = (x: number): number => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)));
/** ln σ(x), computed without overflow. */
export const logSigmoid = (x: number): number => (x >= 0 ? -Math.log1p(Math.exp(-x)) : x - Math.log1p(Math.exp(x)));

export interface PairScore {
  /** P(chosen is preferred) = σ(r_chosen − r_rejected). */
  prob: number;
  /** −ln σ(r_chosen − r_rejected): the reward model's training loss for this pair. */
  loss: number;
  /** How strongly a gradient step pushes the two scores apart: σ(−margin) = 1 − prob. */
  push: number;
}

export function bradleyTerry(rChosen: number, rRejected: number): PairScore {
  const d = rChosen - rRejected;
  const prob = sigmoid(d);
  return { prob, loss: -logSigmoid(d), push: 1 - prob };
}

/** KL(p ‖ q) in nats for two distributions over the same responses. */
export function kl(p: readonly number[], q: readonly number[]): number {
  return p.reduce((a, pi, i) => (pi > 0 ? a + pi * Math.log(pi / q[i]!) : a), 0);
}

export interface KlOptimum {
  policy: number[];
  expectedReward: number;
  kl: number;
  /** Expected reward minus β·KL: the quantity RLHF maximizes. */
  objective: number;
}

/**
 * The best policy for "maximize expected reward − β · KL(π ‖ π_ref)" over a fixed set of responses:
 * π*(y) ∝ π_ref(y) · exp(r(y) / β). Small β trusts the reward model; large β stays close to the reference.
 */
export function klOptimum(ref: readonly number[], reward: readonly number[], beta: number): KlOptimum {
  const w = ref.map((p, i) => p * Math.exp(reward[i]! / beta - Math.max(...reward) / beta));
  const z = w.reduce((a, b) => a + b, 0);
  const policy = w.map((x) => x / z);
  const expectedReward = policy.reduce((a, p, i) => a + p * reward[i]!, 0);
  const d = kl(policy, ref);
  return { policy, expectedReward, kl: d, objective: expectedReward - beta * d };
}

export const expectation = (p: readonly number[], v: readonly number[]): number => p.reduce((a, pi, i) => a + pi * v[i]!, 0);

// ---------- DPO ----------

export interface DpoInput {
  /** Sum of log-probabilities of the chosen response under the policy being trained. */
  policyChosen: number;
  policyRejected: number;
  /** The same under the frozen reference model (the SFT model). */
  refChosen: number;
  refRejected: number;
  beta: number;
}

export interface DpoResult {
  /** β · (log π/π_ref) for each response: DPO's "implicit rewards". */
  rewardChosen: number;
  rewardRejected: number;
  margin: number;
  loss: number;
  /** σ(−margin): the weight of this pair in the gradient. Near 0 once the pair is learned. */
  weight: number;
}

export function dpoLoss(x: DpoInput): DpoResult {
  const rewardChosen = x.beta * (x.policyChosen - x.refChosen);
  const rewardRejected = x.beta * (x.policyRejected - x.refRejected);
  const margin = rewardChosen - rewardRejected;
  return { rewardChosen, rewardRejected, margin, loss: -logSigmoid(margin), weight: sigmoid(-margin) };
}

export interface DpoStep {
  step: number;
  probs: number[];
  loss: number;
  /** Share of pairs whose implicit reward margin is positive. */
  accuracy: number;
}

/**
 * Train a toy policy with DPO: one prompt, a few candidate responses, logits θ initialised to the reference's
 * log-probabilities. For a pair (w, l) the margin is β[(θ_w − θ_l) − (ln ref_w − ln ref_l)] (the softmax normalizer
 * cancels), so ∂loss/∂θ_w = −β σ(−m) and ∂loss/∂θ_l = +β σ(−m). Gradient descent on the mean loss with the step
 * divided by β: adaptive optimizers such as Adam remove the gradient's overall scale in a similar way, so each step
 * moves the logits by about the same amount whatever β is. Then β decides how soon the loss is satisfied: a larger β
 * turns a small logit change into a large margin, so training stops closer to the reference.
 */
export function trainDpo(
  ref: readonly number[],
  pairs: readonly [number, number][],
  beta: number,
  lr: number,
  steps: number,
): DpoStep[] {
  const logRef = ref.map(Math.log);
  const theta = [...logRef];
  const out: DpoStep[] = [];
  const snapshot = (step: number) => {
    const m = Math.max(...theta);
    const e = theta.map((t) => Math.exp(t - m));
    const z = e.reduce((a, b) => a + b, 0);
    const probs = e.map((v) => v / z);
    let loss = 0;
    let right = 0;
    for (const [w, l] of pairs) {
      const margin = beta * (theta[w]! - theta[l]! - (logRef[w]! - logRef[l]!));
      loss += -logSigmoid(margin);
      if (margin > 0) right++;
    }
    out.push({ step, probs, loss: loss / pairs.length, accuracy: right / pairs.length });
  };
  snapshot(0);
  for (let s = 1; s <= steps; s++) {
    const grad = theta.map(() => 0);
    for (const [w, l] of pairs) {
      const margin = beta * (theta[w]! - theta[l]! - (logRef[w]! - logRef[l]!));
      const g = beta * sigmoid(-margin);
      grad[w]! -= g / pairs.length;
      grad[l]! += g / pairs.length;
    }
    for (let i = 0; i < theta.length; i++) theta[i]! -= (lr / beta) * grad[i]!;
    snapshot(s);
  }
  return out;
}
