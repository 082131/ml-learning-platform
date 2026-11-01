import type { ExperimentDef } from '../types';
import { seededRandom } from '../classical/random';

/**
 * A retry loop against a scripted server. The server's behavior per scenario is fixed and stated; the
 * client's decisions (retry or not, how long to wait, when to give up) are computed from the settings.
 * Times are simulated seconds, not measurements.
 */

export type Scenario = 'rate-limit' | 'flaky' | 'outage' | 'bad-request';

export interface ServerReply {
  status: number;
  /** Seconds the request took before this reply. */
  took: number;
  /** Retry-After header in seconds, if the server sent one. */
  retryAfter?: number;
}

/** A 429 rate limit window: every request before this time (from the first request) is rejected. */
export const RATE_LIMIT_UNTIL = 4;
export const RATE_LIMIT_RETRY_AFTER = 4;
export const ERROR_TOOK = 0.2;
export const SUCCESS_TOOK = 1.6;
export const MAX_DELAY = 30;

export const SCENARIOS: { id: Scenario; label: string; describe: string }[] = [
  {
    id: 'rate-limit',
    label: 'Rate limited (429 with Retry-After)',
    describe: `Rejects every request in the first ${RATE_LIMIT_UNTIL} s with 429 and Retry-After: ${RATE_LIMIT_RETRY_AFTER}, then answers.`,
  },
  {
    id: 'flaky',
    label: 'Brief server errors (500, 503, then OK)',
    describe: 'Fails the first request with 500, the second with 503, and answers the third.',
  },
  {
    id: 'outage',
    label: 'Outage (503 every time)',
    describe: 'Answers every request with 503 for the whole simulation.',
  },
  {
    id: 'bad-request',
    label: 'Bad request (400)',
    describe:
      'Rejects the request with 400 because a parameter is invalid. Sending it again changes nothing.',
  },
];

/** The scripted server: what it replies to attempt `n` (from 0) sent at time `t` seconds. */
export function serverReply(scenario: Scenario, n: number, t: number): ServerReply {
  switch (scenario) {
    case 'rate-limit':
      return t < RATE_LIMIT_UNTIL
        ? { status: 429, took: ERROR_TOOK, retryAfter: RATE_LIMIT_RETRY_AFTER }
        : { status: 200, took: SUCCESS_TOOK };
    case 'flaky':
      return n === 0
        ? { status: 500, took: ERROR_TOOK }
        : n === 1
          ? { status: 503, took: ERROR_TOOK }
          : { status: 200, took: SUCCESS_TOOK };
    case 'outage':
      return { status: 503, took: ERROR_TOOK };
    case 'bad-request':
      return { status: 400, took: ERROR_TOOK };
  }
}

/** 408, 409, 429 and 5xx are worth retrying; other 4xx mean the request itself is wrong. */
export function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * Exponential backoff: base · 2^retry, capped at MAX_DELAY. With jitter, a uniform draw in [0, that]
 * ("full jitter"), so many clients that failed together don't retry together.
 */
export function backoffDelay(base: number, retry: number, jitter: boolean, r: number): number {
  const cap = Math.min(MAX_DELAY, base * 2 ** retry);
  return jitter ? r * cap : cap;
}

export interface RetryState {
  scenario: Scenario;
  maxRetries: number;
  baseDelay: number;
  jitter: boolean;
  honorRetryAfter: boolean;
  seed: number;
}

export interface Attempt {
  n: number;
  start: number;
  end: number;
  status: number;
  retryAfter?: number;
  /** Seconds waited after this attempt before the next one, if there is a next one. */
  wait?: number;
  waitReason?: string;
}

export interface RetryResult {
  attempts: Attempt[];
  ok: boolean;
  /** Seconds from the first request to the final reply. */
  total: number;
  stopReason: string;
}

export function simulateRetries(s: RetryState): RetryResult {
  const rand = seededRandom(s.seed);
  const attempts: Attempt[] = [];
  let t = 0;
  for (let n = 0; ; n++) {
    const reply = serverReply(s.scenario, n, t);
    const a: Attempt = {
      n,
      start: t,
      end: t + reply.took,
      status: reply.status,
      retryAfter: reply.retryAfter,
    };
    attempts.push(a);
    t = a.end;
    if (reply.status < 400) return { attempts, ok: true, total: t, stopReason: 'Succeeded' };
    if (!isRetryable(reply.status))
      return {
        attempts,
        ok: false,
        total: t,
        stopReason: `${reply.status} is not retryable: fix the request`,
      };
    if (n >= s.maxRetries)
      return {
        attempts,
        ok: false,
        total: t,
        stopReason: s.maxRetries === 0 ? 'Retries are off' : `Gave up after ${s.maxRetries} retries`,
      };
    const r = rand();
    if (s.honorRetryAfter && reply.retryAfter !== undefined) {
      a.wait = reply.retryAfter;
      a.waitReason = `Retry-After: ${reply.retryAfter}`;
    } else {
      a.wait = backoffDelay(s.baseDelay, n, s.jitter, r);
      a.waitReason = s.jitter
        ? `random in [0, ${Math.min(MAX_DELAY, s.baseDelay * 2 ** n)}]`
        : `${s.baseDelay} · 2^${n}`;
    }
    t += a.wait;
  }
}

const fmt = (x: number) => `${Number(x.toFixed(2))} s`;

export function retryExperiment(id: string, initial: RetryState): ExperimentDef<RetryState, RetryResult> {
  const yesNo = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'scenario',
        label: 'Server behavior',
        options: SCENARIOS.map((x) => ({ value: x.id, label: x.label })),
        get: (s) => s.scenario,
        set: (s, v) => ({ ...s, scenario: v as Scenario }),
      },
      {
        kind: 'slider',
        id: 'maxRetries',
        label: 'Max retries',
        min: 0,
        max: 6,
        get: (s) => s.maxRetries,
        set: (s, v) => ({ ...s, maxRetries: Math.round(v) }),
      },
      {
        kind: 'slider',
        id: 'baseDelay',
        label: 'Base delay (s)',
        min: 0.5,
        max: 4,
        step: 0.5,
        get: (s) => s.baseDelay,
        set: (s, v) => ({ ...s, baseDelay: v }),
      },
      {
        kind: 'select',
        id: 'jitter',
        label: 'Random jitter',
        options: yesNo,
        get: (s) => (s.jitter ? 'yes' : 'no'),
        set: (s, v) => ({ ...s, jitter: v === 'yes' }),
      },
      {
        kind: 'select',
        id: 'honorRetryAfter',
        label: 'Respect Retry-After',
        options: yesNo,
        get: (s) => (s.honorRetryAfter ? 'yes' : 'no'),
        set: (s, v) => ({ ...s, honorRetryAfter: v === 'yes' }),
      },
    ],
    compute: simulateRetries,
    readout: (_s, r) => [
      { label: 'Outcome', value: r.stopReason, status: r.ok ? 'ok' : 'error' },
      { label: 'Requests sent', value: String(r.attempts.length) },
      { label: 'Time until the final reply', value: fmt(r.total) },
      {
        label: 'Time spent waiting',
        value: fmt(r.attempts.reduce((a, x) => a + (x.wait ?? 0), 0)),
      },
    ],
  };
}
