// Retry schedules for calls to flaky APIs: no retry, fixed delay, exponential backoff, and exponential backoff with
// "full jitter" (a random delay between 0 and the exponential value, as in the AWS Architecture Blog's
// "Exponential Backoff And Jitter"). Randomness comes from a seeded generator, so a given seed always gives the same
// picture and the tests can pin it.

export type Strategy = 'none' | 'fixed' | 'exponential' | 'jitter';

export interface RetryPolicy {
  strategy: Strategy;
  /** Seconds: the fixed delay, or the first exponential delay. */
  base: number;
  /** Seconds: no single wait is longer than this. */
  cap: number;
  /** Total attempts, including the first. */
  maxAttempts: number;
  /** Honour a Retry-After header when the server sends one (429 and 503 responses). */
  respectRetryAfter: boolean;
}

/** One response the server will give, in order. The last one repeats if the client keeps trying. */
export interface ServerReply {
  status: number;
  retryAfter?: number;
}

export interface Attempt {
  n: number;
  /** Seconds since the first attempt started. Calls are assumed to take no time. */
  at: number;
  status: number;
  /** Seconds waited before the next attempt, or null after the last one. */
  wait: number | null;
  /** Why the client stopped or why it waited this long. */
  note: string;
}

export interface RetryRun {
  attempts: Attempt[];
  ok: boolean;
  /** Seconds from the first attempt to the end. */
  elapsed: number;
}

/** mulberry32: a small, well-known 32-bit PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Status codes worth retrying: the request may succeed later. 4xx other than 408/429 will fail the same way again. */
export const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** The delay before retry number `retry` (1 = the first retry), before any Retry-After override. */
export function backoffDelay(p: Pick<RetryPolicy, 'strategy' | 'base' | 'cap'>, retry: number, rand: () => number): number {
  if (p.strategy === 'none') return 0;
  if (p.strategy === 'fixed') return Math.min(p.cap, p.base);
  const exp = Math.min(p.cap, p.base * 2 ** (retry - 1));
  return p.strategy === 'jitter' ? rand() * exp : exp;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function simulateRetries(p: RetryPolicy, replies: ServerReply[], seed = 1): RetryRun {
  const rand = mulberry32(seed);
  const attempts: Attempt[] = [];
  let t = 0;
  const limit = p.strategy === 'none' ? 1 : p.maxAttempts;
  for (let n = 1; n <= limit; n++) {
    const reply = replies[Math.min(n - 1, replies.length - 1)]!;
    if (reply.status < 400) {
      attempts.push({ n, at: r2(t), status: reply.status, wait: null, note: 'success' });
      return { attempts, ok: true, elapsed: r2(t) };
    }
    if (!RETRYABLE.has(reply.status)) {
      attempts.push({ n, at: r2(t), status: reply.status, wait: null, note: `${reply.status} is not retryable: fail now` });
      return { attempts, ok: false, elapsed: r2(t) };
    }
    if (n === limit) {
      attempts.push({ n, at: r2(t), status: reply.status, wait: null, note: p.strategy === 'none' ? 'no retries: fail' : 'out of attempts: fail' });
      return { attempts, ok: false, elapsed: r2(t) };
    }
    let wait = backoffDelay(p, n, rand);
    let note = p.strategy === 'fixed' ? 'fixed delay' : p.strategy === 'exponential' ? `base × 2^${n - 1}` : `random in [0, base × 2^${n - 1}]`;
    if (p.respectRetryAfter && reply.retryAfter !== undefined && reply.retryAfter > wait) {
      wait = reply.retryAfter;
      note = `Retry-After: ${reply.retryAfter}`;
    }
    attempts.push({ n, at: r2(t), status: reply.status, wait: r2(wait), note });
    t += wait;
  }
  return { attempts, ok: false, elapsed: r2(t) };
}

/**
 * The thundering herd: `clients` clients all fail at time 0 against a server that recovers only when fewer than
 * `capacity` requests arrive in the same one-second bucket. Returns how many requests land in each second for the
 * first `seconds` seconds, assuming every retry fails until then (the worst case the jitter is meant to fix).
 */
export function herd(p: Pick<RetryPolicy, 'strategy' | 'base' | 'cap' | 'maxAttempts'>, clients: number, seconds: number, seed = 7): number[] {
  const buckets = new Array<number>(seconds).fill(0);
  const rand = mulberry32(seed);
  for (let c = 0; c < clients; c++) {
    let t = 0;
    const limit = p.strategy === 'none' ? 1 : p.maxAttempts;
    for (let n = 1; n <= limit; n++) {
      const b = Math.floor(t);
      if (b < seconds) buckets[b] = buckets[b]! + 1;
      t += backoffDelay(p, n, rand);
    }
  }
  return buckets;
}
