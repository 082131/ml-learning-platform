import { describe, expect, it } from 'vitest';
import vocabText from './data/vocab.txt?raw';
import { simulateCanary, twoProportionZ } from './canary';
import { computeCost } from './costModel';
import { claimsIn, citationsIn, runEval } from './evals';
import { runGuardrail } from './guardrails';
import { buildIvf, makeVectors, recallAtK, searchIvf, topK } from './ivf';
import { parseReply, retryMessage, validate, type Schema } from './jsonSchema';
import { lumenDocs, lumenQueries, lumenVectors } from './lumen';
import { meanReciprocalRank, recallAt, retrievalEvalExperiment } from './retrievalEval';
import { backoffDelay, isRetryable, simulateRetries, type RetryState } from './retry';
import { computeStream, encodeEvent, generationTime, SseParser, splitRandomly } from './sse';
import { runPolicy } from './toolPolicy';
import { computeTriage, scorePrompt } from './triage';
import { parseVocab } from './wordpiece';

describe('retries', () => {
  const base: RetryState = {
    scenario: 'rate-limit',
    maxRetries: 4,
    baseDelay: 1,
    jitter: false,
    honorRetryAfter: true,
    seed: 7,
  };
  it('backs off exponentially, capped, with optional full jitter', () => {
    expect([0, 1, 2, 3].map((n) => backoffDelay(1, n, false, 0.5))).toEqual([1, 2, 4, 8]);
    expect(backoffDelay(4, 5, false, 0)).toBe(30); // 4 · 32 = 128, capped at 30
    expect(backoffDelay(2, 2, true, 0.25)).toBe(2); // 0.25 · 8
  });
  it('knows which statuses are worth retrying', () => {
    expect([408, 409, 429, 500, 503].every(isRetryable)).toBe(true);
    expect([400, 401, 403, 404, 422].some(isRetryable)).toBe(false);
  });
  it('waits for Retry-After instead of hammering a rate limit', () => {
    const honored = simulateRetries(base);
    expect(honored.attempts.map((a) => a.status)).toEqual([429, 200]);
    expect(honored.total).toBeCloseTo(5.8, 9); // 0.2 + 4 + 1.6
    const ignored = simulateRetries({ ...base, honorRetryAfter: false });
    // waits 1, 2, 4: requests at 0, 1.2, 3.4 are still inside the 4 s window; the one at 7.6 succeeds
    expect(ignored.attempts.map((a) => a.status)).toEqual([429, 429, 429, 200]);
    expect(ignored.attempts.map((a) => a.start)).toEqual([0, 1.2, 3.4, 7.6].map((x) => expect.closeTo(x, 9)));
  });
  it('gives up on an outage, and never retries a 400', () => {
    const outage = simulateRetries({ ...base, scenario: 'outage' });
    expect(outage.ok).toBe(false);
    expect(outage.attempts).toHaveLength(5);
    expect(outage.total).toBeCloseTo(16, 9); // 5 · 0.2 + 1 + 2 + 4 + 8
    expect(simulateRetries({ ...base, scenario: 'bad-request' }).attempts).toHaveLength(1);
    expect(simulateRetries({ ...base, scenario: 'flaky', maxRetries: 0 }).stopReason).toBe('Retries are off');
  });
});

describe('JSON schema validation', () => {
  const schema: Schema = {
    type: 'object',
    properties: {
      n: { type: 'integer', minimum: 1, maximum: 3 },
      tag: { type: 'string', enum: ['a', 'b'] },
      list: { type: 'array', items: { type: 'number' } },
    },
    required: ['n'],
    additionalProperties: false,
  };
  it('reports every problem with its path', () => {
    expect(validate(schema, { n: 2, tag: 'a', list: [1, 2.5] })).toEqual([]);
    expect(validate(schema, { n: 2.5 })).toEqual(['$.n: expected integer, got number']);
    expect(validate(schema, { n: 4, tag: 'c', x: 1, list: [1, 'two'] })).toEqual([
      '$.n: 4 is more than the maximum 3',
      '$.tag: "c" is not one of "a", "b"',
      '$: unexpected property "x"',
      '$.list[1]: expected number, got string',
    ]);
    expect(validate(schema, [])).toEqual(['$: expected object, got array']);
    expect(validate(schema, {})).toEqual(['$: missing required property "n"']);
  });
  it('unwraps a fence only when asked, and never guesses around prose', () => {
    expect(parseReply('```json\n{"a": 1}\n```', true)).toMatchObject({ ok: true, value: { a: 1 } });
    expect(parseReply('```json\n{"a": 1}\n```', false).ok).toBe(false);
    expect(parseReply('Here: {"a": 1}', true).ok).toBe(false);
    expect(retryMessage(['$.n: x'])).toContain('- $.n: x\n');
  });
  it('triage replies and the prompt comparison', () => {
    expect(computeTriage({ reply: 'valid', stripFences: true }).valid).toBe(true);
    expect(computeTriage({ reply: 'extra', stripFences: true }).errors).toEqual([
      '$.summary: string is 87 characters, longer than 80',
      '$: unexpected property "sentiment"',
    ]);
    expect([scorePrompt('a', false).correct, scorePrompt('a', true).correct, scorePrompt('b', true).correct]).toEqual([
      5, 6, 9,
    ]);
  });
});

describe('IVF index', () => {
  it('finds the exact top k when it searches every cluster', () => {
    const set = makeVectors(3, 300, 5);
    const index = buildIvf(set.vectors, 8, 3);
    expect(index.lists.flat().sort((a, b) => a - b)).toEqual(set.vectors.map((_, i) => i));
    const all = set.vectors.map((_, i) => i);
    for (const q of set.queries) {
      const r = searchIvf(index, set.vectors, q, 8, 5);
      expect(r.ids).toEqual(topK(q, set.vectors, all, 5));
      expect(r.scanned).toBe(300);
    }
  });
  it('recall is the overlap with the exact result', () => {
    expect(recallAtK([1, 2, 3, 4], [4, 9, 1, 8])).toBe(0.5);
    expect(topK([1, 0], [[0, 1], [1, 0], [0.6, 0.8]], [0, 1, 2], 2)).toEqual([1, 2]);
  });
});

describe('retrieval evaluation', () => {
  it('recall@k and MRR from ranks (hand-worked)', () => {
    const ranks = [1, 2, undefined, 4];
    expect(recallAt(ranks, 1)).toBe(0.25);
    expect(recallAt(ranks, 3)).toBe(0.5);
    expect(meanReciprocalRank(ranks)).toBeCloseTo((1 + 0.5 + 0 + 0.25) / 4, 12);
  });
  it('on the Lumen questions, reranking lifts E-402 from rank 2 to rank 1', () => {
    const data = { docs: lumenDocs, queries: lumenQueries, vectors: lumenVectors(), vocab: parseVocab(vocabText) };
    const exp = retrievalEvalExperiment('t', data, { size: 40, overlap: 10, keywordWeight: 0.5 });
    const r = exp.compute(exp.initial);
    expect(r.rows).toHaveLength(6);
    expect(r.recall[1]).toBe(1);
    expect(r.baseline.recall[1]).toBeCloseTo(5 / 6, 12);
    expect(r.baseline.mrr).toBeCloseTo((5 + 0.5) / 6, 12);
  });
});

describe('server-sent events', () => {
  it('encodes and parses events split anywhere', () => {
    const wire = encodeEvent({ event: 'text_delta', data: 'a\nb' }) + ': ping\n\n' + 'data: x\r\n\r\n';
    expect(wire.startsWith('event: text_delta\ndata: a\ndata: b\n\n')).toBe(true);
    for (const n of [1, 3, 7, 20]) {
      const p = new SseParser();
      const events = splitRandomly(wire, n, n).flatMap((c) => p.feed(c));
      expect(events).toEqual([
        { event: 'text_delta', data: 'a\nb' },
        { event: 'message', data: 'x' },
      ]);
    }
    expect(splitRandomly('abcdef', 3, 1).join('')).toBe('abcdef');
  });
  it('times streaming against waiting (formula)', () => {
    expect(generationTime({ ttft: 1, tokensPerSecond: 40, outputTokens: 800 })).toBe(21);
    const r = computeStream({ ttft: 1, tokensPerSecond: 40, outputTokens: 800, timeout: 15, pieces: 5 });
    expect([r.streaming.ok, r.waiting.ok]).toEqual([true, false]);
    expect(r.text).toBe('Error E-402 means your storage quota is full [1].');
  });
});

describe('evals and guardrails', () => {
  it('extracts citations and checkable claims', () => {
    expect(citationsIn('A [1] and [12].')).toEqual([1, 12]);
    expect(claimsIn('Error E-402 costs $6 or 20% [1], 6 again.')).toEqual(['E-402', '6', '20%']);
  });
  it('grades both prompt versions', () => {
    const v1 = runEval('v1');
    expect(v1.passed).toBe(4);
    expect(v1.byCategory).toEqual({
      correct: 4,
      'wrong fact': 1,
      'unsupported claim': 2,
      'bad citation': 1,
      'answered without a source': 2,
    });
    expect(v1.rows.find((r) => r.id === 'rate-limit')!.unsupported).toEqual(['100']);
    const v2 = runEval('v2');
    expect(v2.passed).toBe(9);
    expect(v2.rows.find((r) => r.id === 'monthly-refund')!.category).toBe('missed answer');
  });
  it('trades catches for false blocks as rules get stricter', () => {
    expect(['lenient', 'standard', 'strict'].map((s) => {
      const r = runGuardrail(s as 'lenient');
      return [r.caught, r.missed, r.wronglyBlocked];
    })).toEqual([
      [1, 7, 0],
      [5, 3, 0],
      [7, 1, 4],
    ]);
  });
});

describe('cost, security policy and canary', () => {
  const c = {
    requestsPerDay: 20000,
    fixedPromptTokens: 3000,
    variableTokens: 1500,
    outputTokens: 300,
    inputPrice: 4,
    outputPrice: 20,
    promptCache: false,
    responseCacheRate: 0,
  };
  it('estimates cost per request and per month (hand-worked)', () => {
    // 4500 · 4/1e6 + 300 · 20/1e6 = 0.018 + 0.006
    expect(computeCost(c).perRequest.total).toBeCloseTo(0.024, 12);
    expect(computeCost(c).monthly).toBeCloseTo(14400, 6); // 20000 · 30 · 0.024
    // cached: 1500 · 4/1e6 + 3000 · 0.4/1e6 + 0.006 = 0.006 + 0.0012 + 0.006
    expect(computeCost({ ...c, promptCache: true }).perRequest.total).toBeCloseTo(0.0132, 12);
    expect(computeCost({ ...c, promptCache: true, responseCacheRate: 0.2 }).monthly).toBeCloseTo(6336, 6);
    // latency: 0.4 + 4.5 · 0.15 + 300 / 60
    expect(computeCost(c).latency).toBeCloseTo(6.075, 12);
  });
  it('blocks or holds the injected tool calls', () => {
    const off = { taskAllowlist: false, confirmSideEffects: false, recipientCheck: false };
    expect(runPolicy(off).harmfulRuns).toBe(2);
    expect(runPolicy({ ...off, recipientCheck: true }).harmfulRuns).toBe(1);
    expect(runPolicy({ ...off, taskAllowlist: true }).rows.map((r) => r.decision)).toEqual([
      'runs',
      'blocked',
      'blocked',
    ]);
    expect(runPolicy({ ...off, confirmSideEffects: true }).harmfulRuns).toBe(0);
  });
  it('z statistic (hand-worked) and canary detection', () => {
    // 50/1000 vs 80/1000: pooled 0.065, se = √(0.065 · 0.935 · 0.002) ≈ 0.011026
    expect(twoProportionZ(50, 1000, 80, 1000)).toBeCloseTo(0.03 / Math.sqrt(0.065 * 0.935 * 0.002), 9);
    const same = simulateCanary({ scenario: 'same', share: 0.1, autoRollback: true, seed: 1 });
    expect(same.alertHour).toBeUndefined();
    const bad = simulateCanary({ scenario: 'big-regression', share: 0.1, autoRollback: true, seed: 1 });
    expect(bad.alertHour).toBe(2);
    expect(bad.hours.slice(bad.alertHour).every((h) => h.newN === 0)).toBe(true);
  });
});
