// Next-token loss for the LLM fine-tuning track. Pure functions, unit-tested in finetune.test.ts against
// hand-worked numbers.

/** The loss of one prediction: −ln p, where p is the probability the model gave to the correct next token. */
export function tokenLoss(p: number): number {
  if (!(p > 0 && p <= 1)) throw new RangeError(`probability must be in (0, 1], got ${p}`);
  return p === 1 ? 0 : -Math.log(p);
}

export interface SequenceLoss {
  /** −ln p for every predicted token, in order. */
  losses: number[];
  /** The average of `losses`: the number training minimizes. */
  mean: number;
  /** e^mean: the "effective number of equally likely choices" the model is hesitating between. */
  perplexity: number;
  /** mean / ln 2: the same loss measured in bits per token. */
  bits: number;
}

/** Cross-entropy of a whole sequence from the probabilities given to each correct token. */
export function sequenceLoss(probs: readonly number[]): SequenceLoss {
  if (!probs.length) throw new RangeError('need at least one token');
  const losses = probs.map(tokenLoss);
  const mean = losses.reduce((a, b) => a + b, 0) / losses.length;
  return { losses, mean, perplexity: Math.exp(mean), bits: mean / Math.LN2 };
}

/** The loss of a model that knows nothing and spreads probability evenly over the whole vocabulary. */
export const uniformLoss = (vocabSize: number): number => Math.log(vocabSize);

/** Softmax with the usual max-subtraction for numerical safety. */
export function softmax(logits: readonly number[]): number[] {
  const m = Math.max(...logits);
  const e = logits.map((x) => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}

export const round = (x: number, digits = 3): number => {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
};
