// "Should we fine-tune?" helpers: a rule-based recommendation and a payback estimate. Prices are inputs (examples
// in the lesson), so every output is an estimate.

export type Problem = 'facts' | 'format' | 'cost' | 'skill';

export interface DecideInput {
  /** What is wrong with the model's answers today. */
  problem: Problem;
  /** Do the facts the model needs change often (weekly prices, docs, tickets)? */
  factsChange: boolean;
  /** High-quality examples of the desired input and output you already have. */
  examples: number;
  /** Has a careful prompt (instructions plus a few examples) already been tried and measured? */
  promptTried: boolean;
}

export interface Recommendation {
  approach: 'prompt' | 'rag' | 'fine-tune' | 'collect-data';
  label: string;
  reasons: string[];
}

/** Ordered rules from the lesson: cheapest fix first, fine-tuning only when it targets the actual problem. */
export function recommendApproach(x: DecideInput): Recommendation {
  if (!x.promptTried) {
    return {
      approach: 'prompt',
      label: 'Start with prompting',
      reasons: [
        'A clear prompt with a few examples takes hours, not weeks, and gives you the baseline every later step is compared with.',
        'Without a measured baseline you cannot tell whether a fine-tune helped.',
      ],
    };
  }
  if (x.problem === 'facts') {
    return {
      approach: 'rag',
      label: 'Use retrieval (RAG)',
      reasons: [
        'Missing or wrong facts are a knowledge problem. Retrieval puts the facts into the prompt at question time.',
        x.factsChange
          ? 'The facts change often. A fine-tune would freeze them at training time and need retraining every change.'
          : 'Even stable facts are learned unreliably by fine-tuning; retrieval also lets you cite the source.',
      ],
    };
  }
  if (x.examples < 100) {
    return {
      approach: 'collect-data',
      label: 'Collect examples first',
      reasons: [
        `${x.examples} examples are too few to fine-tune reliably; put the best ones in the prompt as few-shot examples.`,
        'Log real requests and fix the answers by hand: that becomes the training and evaluation set.',
      ],
    };
  }
  const why: Record<Exclude<Problem, 'facts'>, string> = {
    format: 'A consistent format, tone or style is behaviour, and behaviour is what fine-tuning changes well.',
    cost: 'A fine-tuned small model can replace a large model plus a long prompt, cutting cost and latency per request.',
    skill: 'A narrow skill the base model does poorly (a classification scheme, a domain language) improves with examples it can learn from.',
  };
  return {
    approach: 'fine-tune',
    label: 'Fine-tune (start with LoRA)',
    reasons: [
      why[x.problem],
      `${x.examples} examples is enough for a first parameter-efficient fine-tune; hold out 10 to 20% for evaluation.`,
      ...(x.factsChange ? ['Pair it with retrieval for the facts that change: fine-tune the behaviour, retrieve the knowledge.'] : []),
    ],
  };
}

export interface PaybackInput {
  requestsPerDay: number;
  /** Prompt tokens the fine-tune makes unnecessary (instructions and few-shot examples), per request. */
  savedTokens: number;
  /** Price of input tokens, dollars per million. */
  pricePerMTok: number;
  /** Training tokens: examples × average length × epochs. */
  trainTokensM: number;
  /** Training price, dollars per million training tokens. */
  trainPricePerMTok: number;
  /** People time to build data and evaluate, in dollars. */
  peopleCost: number;
}

export interface PaybackResult {
  oneTime: number;
  savedPerMonth: number;
  /** Months until the savings repay the one-time cost; null when nothing is saved. */
  paybackMonths: number | null;
}

/** One month is 30 days here, as in the lesson's worked example. */
export function payback(x: PaybackInput): PaybackResult {
  const oneTime = x.trainTokensM * x.trainPricePerMTok + x.peopleCost;
  const savedPerMonth = (x.requestsPerDay * 30 * x.savedTokens * x.pricePerMTok) / 1e6;
  return { oneTime, savedPerMonth, paybackMonths: savedPerMonth > 0 ? oneTime / savedPerMonth : null };
}
