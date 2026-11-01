import type { ExperimentDef } from '../types';

/**
 * A cost and latency estimate for one AI feature, from token counts, prices and request volume. Every
 * number is an estimate from the formulas below and example prices, not a measurement or a quote.
 */

export interface CostState {
  requestsPerDay: number;
  /** Instructions and examples that are the same in every request. */
  fixedPromptTokens: number;
  /** Retrieved context and the question: different in every request. */
  variableTokens: number;
  outputTokens: number;
  /** Example prices, dollars per million tokens. */
  inputPrice: number;
  outputPrice: number;
  /** Prompt caching on: the fixed prefix is read from the provider's cache after the first request. */
  promptCache: boolean;
  /** Share of requests answered from your own response cache, skipping the model (0 to 1). */
  responseCacheRate: number;
}

/** Cache reads are billed at this fraction of the input price (a common ratio; check your provider). */
export const CACHE_READ_FACTOR = 0.1;
export const DAYS = 30;
/** Latency model: time to first token grows with the prompt; then tokens arrive at a steady rate. */
export const LATENCY = { baseTtft: 0.4, secondsPerKInput: 0.15, cachedSecondsPerKInput: 0.02, tokensPerSecond: 60 };
export const CACHE_HIT_LATENCY = 0.05;

export interface CostResult {
  perRequest: { uncachedInput: number; cachedInput: number; output: number; total: number };
  monthly: number;
  /** Monthly cost with all optimizations off, for comparison. */
  monthlyBaseline: number;
  /** Seconds to the first token and to the last, for a request that reaches the model. */
  ttft: number;
  latency: number;
  /** Average latency including response-cache hits. */
  meanLatency: number;
}

export function computeCost(s: CostState): CostResult {
  const m = 1e6;
  const cachedTokens = s.promptCache ? s.fixedPromptTokens : 0;
  const uncachedTokens = s.fixedPromptTokens + s.variableTokens - cachedTokens;
  const uncachedInput = (uncachedTokens * s.inputPrice) / m;
  const cachedInput = (cachedTokens * s.inputPrice * CACHE_READ_FACTOR) / m;
  const output = (s.outputTokens * s.outputPrice) / m;
  const total = uncachedInput + cachedInput + output;
  const modelRequests = s.requestsPerDay * DAYS * (1 - s.responseCacheRate);
  const baselinePerRequest = ((s.fixedPromptTokens + s.variableTokens) * s.inputPrice + s.outputTokens * s.outputPrice) / m;
  const ttft =
    LATENCY.baseTtft +
    (uncachedTokens / 1000) * LATENCY.secondsPerKInput +
    (cachedTokens / 1000) * LATENCY.cachedSecondsPerKInput;
  const latency = ttft + s.outputTokens / LATENCY.tokensPerSecond;
  return {
    perRequest: { uncachedInput, cachedInput, output, total },
    monthly: modelRequests * total,
    monthlyBaseline: s.requestsPerDay * DAYS * baselinePerRequest,
    ttft,
    latency,
    meanLatency: s.responseCacheRate * CACHE_HIT_LATENCY + (1 - s.responseCacheRate) * latency,
  };
}

const usd = (n: number) =>
  n >= 100 ? `$${Math.round(n).toLocaleString('en-US')}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(5)}`;
export { usd as formatUsd };

export function costExperiment(id: string, initial: CostState): ExperimentDef<CostState, CostResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'requests',
        label: 'Requests per day',
        min: 1000,
        max: 100000,
        step: 1000,
        format: (v) => v.toLocaleString('en-US'),
        get: (s) => s.requestsPerDay,
        set: (s, v) => ({ ...s, requestsPerDay: v }),
      },
      {
        kind: 'slider',
        id: 'fixed',
        label: 'Fixed prompt (instructions, examples), tokens',
        min: 0,
        max: 8000,
        step: 500,
        get: (s) => s.fixedPromptTokens,
        set: (s, v) => ({ ...s, fixedPromptTokens: v }),
      },
      {
        kind: 'slider',
        id: 'variable',
        label: 'Retrieved context and question, tokens',
        min: 100,
        max: 8000,
        step: 100,
        get: (s) => s.variableTokens,
        set: (s, v) => ({ ...s, variableTokens: v }),
      },
      {
        kind: 'slider',
        id: 'output',
        label: 'Output, tokens',
        min: 50,
        max: 2000,
        step: 50,
        get: (s) => s.outputTokens,
        set: (s, v) => ({ ...s, outputTokens: v }),
      },
      {
        kind: 'select',
        id: 'model',
        label: 'Model tier (example prices per million tokens)',
        options: [
          { value: 'large', label: 'Large: $4 in, $20 out' },
          { value: 'medium', label: 'Medium: $2 in, $10 out' },
          { value: 'small', label: 'Small: $0.10 in, $0.50 out' },
        ],
        get: (s) => (s.inputPrice === 4 ? 'large' : s.inputPrice === 2 ? 'medium' : 'small'),
        set: (s, v) =>
          v === 'large'
            ? { ...s, inputPrice: 4, outputPrice: 20 }
            : v === 'medium'
              ? { ...s, inputPrice: 2, outputPrice: 10 }
              : { ...s, inputPrice: 0.1, outputPrice: 0.5 },
      },
      {
        kind: 'select',
        id: 'promptCache',
        label: 'Prompt caching of the fixed prefix',
        options: [
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ],
        get: (s) => (s.promptCache ? 'on' : 'off'),
        set: (s, v) => ({ ...s, promptCache: v === 'on' }),
      },
      {
        kind: 'slider',
        id: 'responseCache',
        label: 'Answered from your response cache',
        min: 0,
        max: 0.5,
        step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
        get: (s) => s.responseCacheRate,
        set: (s, v) => ({ ...s, responseCacheRate: Math.round(v * 100) / 100 }),
      },
    ],
    compute: computeCost,
    readout: (_s, r) => [
      { label: 'Per model request', value: usd(r.perRequest.total) },
      { label: 'Per month (estimate)', value: usd(r.monthly) },
      { label: 'Without caching (estimate)', value: usd(r.monthlyBaseline) },
      { label: 'Time to first token', value: `${r.ttft.toFixed(2)} s` },
      { label: 'Full reply', value: `${r.latency.toFixed(2)} s (mean ${r.meanLatency.toFixed(2)} s with cache hits)` },
    ],
  };
}
