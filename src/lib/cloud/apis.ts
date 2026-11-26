// Pay a managed model API per token, or rent GPUs and host an open model yourself? Token prices, GPU price and
// throughput are inputs: the defaults are illustrative, not quotes. Self-hosting pays for GPUs every hour whether or
// not requests arrive, plus engineering time; the API pays only per token.

export interface ApiInput {
  requestsPerDay: number;
  inputTokens: number;
  outputTokens: number;
  /** $ per million input tokens. */
  priceIn: number;
  /** $ per million output tokens. */
  priceOut: number;
  gpuPricePerHour: number;
  /** Output tokens per second one GPU sustains with batching. */
  tokensPerSecondPerGpu: number;
  /** Busiest hour ÷ average hour. */
  peakFactor: number;
  /** Engineer hours per month to run the self-hosted stack (upgrades, on-call, scaling). */
  opsHours: number;
  opsRate: number;
}

export interface SelfHost {
  gpus: number;
  gpuCost: number;
  ops: number;
  total: number;
  utilization: number;
}

export interface ApiResult {
  api: number;
  selfHost: SelfHost;
  /** Requests per day where both cost the same, or null if self-hosting never wins below 100 million a day. */
  breakEvenPerDay: number | null;
  cheaper: 'api' | 'self-host';
}

export const DAYS_PER_MONTH = 30;
export const HOURS_PER_MONTH = 730;

export function apiCost(x: ApiInput, perDay = x.requestsPerDay): number {
  return (DAYS_PER_MONTH * perDay * (x.inputTokens * x.priceIn + x.outputTokens * x.priceOut)) / 1e6;
}

export function selfHostCost(x: ApiInput, perDay = x.requestsPerDay): SelfHost {
  const avgTps = (perDay * x.outputTokens) / 86400;
  const gpus = Math.max(1, Math.ceil((avgTps * x.peakFactor) / x.tokensPerSecondPerGpu));
  const gpuCost = gpus * HOURS_PER_MONTH * x.gpuPricePerHour;
  const ops = x.opsHours * x.opsRate;
  return { gpus, gpuCost, ops, total: gpuCost + ops, utilization: avgTps / (gpus * x.tokensPerSecondPerGpu) };
}

export function compareApi(x: ApiInput): ApiResult {
  const api = apiCost(x);
  const selfHost = selfHostCost(x);
  let breakEvenPerDay: number | null = null;
  for (let e = 1; e <= 8; e += 0.01) {
    const r = 10 ** e;
    if (apiCost(x, r) >= selfHostCost(x, r).total) {
      breakEvenPerDay = Math.round(r);
      break;
    }
  }
  return { api, selfHost, breakEvenPerDay, cheaper: api <= selfHost.total ? 'api' : 'self-host' };
}
