import { describe, expect, it } from 'vitest';
import corpus from './data/corpus.json';
import {
  apiCostPerRequest,
  apiMonthly,
  breakEvenPerDay,
  computeApproach,
  selfHostMonthly,
  type ApproachState,
} from './approach';
import { candidates, detokenize, generate, sampleIndex, softmaxT, topPMask, trainBigram, wordTokens } from './nextToken';

const base: ApproachState = {
  task: 'general-language',
  labels: 100,
  privacy: 'cloud-ok',
  requestsPerDay: 1000,
  gpuHourly: 1.5,
};
const verdict = (s: ApproachState, id: string) => computeApproach(s).rows.find((r) => r.id === id)!.verdict;

describe('approach costs (hand-worked)', () => {
  it('prices one request and a month of requests', () => {
    // 1500 · $1/1e6 + 300 · $5/1e6 = 0.0015 + 0.0015
    expect(apiCostPerRequest()).toBeCloseTo(0.003, 12);
    expect(apiMonthly(1000)).toBeCloseTo(90, 9); // 1000 · 30 · 0.003
    expect(selfHostMonthly(1.5)).toBeCloseTo(1080, 9); // 1.5 · 720
    expect(breakEvenPerDay(1.5)).toBeCloseTo(12000, 6); // 1080 / (30 · 0.003)
  });
});

describe('approach rules', () => {
  it('starts a general language task with the API', () => {
    expect(computeApproach(base).recommended).toBe('api');
    expect(verdict(base, 'fine-tune')).toBe('poor');
    expect(verdict(base, 'train')).toBe('poor');
  });

  it('moves to a self-run pretrained model when data must stay in house', () => {
    const s = { ...base, privacy: 'stay-in-house' as const };
    expect(verdict(s, 'api')).toBe('poor');
    expect(computeApproach(s).recommended).toBe('pretrained');
  });

  it('fits fine-tuning for a domain task with enough labels', () => {
    const s = { ...base, task: 'domain-language' as const, labels: 10000, privacy: 'stay-in-house' as const };
    expect(verdict(s, 'fine-tune')).toBe('fits');
  });

  it('recommends training a classical model for tabular data', () => {
    const s = { ...base, task: 'tabular' as const, labels: 10000 };
    expect(computeApproach(s).recommended).toBe('train');
    expect(verdict(s, 'api')).toBe('poor');
    expect(verdict({ ...s, labels: 100 }, 'train')).toBe('possible');
  });

  it('says self-hosting a pretrained model is only "possible" while the API is cheaper', () => {
    expect(verdict(base, 'pretrained')).toBe('possible');
    expect(verdict({ ...base, requestsPerDay: 20000 }, 'pretrained')).toBe('fits');
  });
});

describe('next-token sampling (hand-worked)', () => {
  it('softmax with temperature', () => {
    // logits log(3), log(1): T = 1 gives 3/4, 1/4; T = 0.5 squares the ratio: 9/10, 1/10
    const l = [Math.log(3), Math.log(1)];
    expect(softmaxT(l, 1)[0]).toBeCloseTo(0.75, 12);
    expect(softmaxT(l, 0.5)[0]).toBeCloseTo(0.9, 12);
    expect(softmaxT(l, 0)).toEqual([1, 0]);
    // T = 2 takes the square root of the ratio: √3 / (√3 + 1)
    expect(softmaxT(l, 2)[0]).toBeCloseTo(Math.sqrt(3) / (Math.sqrt(3) + 1), 12);
  });

  it('top-p keeps the smallest set reaching p', () => {
    expect(topPMask([0.5, 0.3, 0.15, 0.05], 0.8)).toEqual([true, true, false, false]);
    expect(topPMask([0.5, 0.3, 0.15, 0.05], 0.81)).toEqual([true, true, true, false]);
    expect(topPMask([0.05, 0.5, 0.3, 0.15], 0.5)).toEqual([false, true, false, false]);
    expect(topPMask([0.25, 0.25, 0.25, 0.25], 1)).toEqual([true, true, true, true]);
  });

  it('samples by cumulative probability', () => {
    expect(sampleIndex([0.5, 0.3, 0.2], 0.49)).toBe(0);
    expect(sampleIndex([0.5, 0.3, 0.2], 0.5)).toBe(1);
    expect(sampleIndex([0.5, 0.3, 0.2], 0.95)).toBe(2);
    expect(sampleIndex([0.6, 0.4, 0], 0.9999999)).toBe(1);
  });

  it('counts bigrams from text', () => {
    expect(wordTokens('Error E-402 means: full.')).toEqual(['error', 'e-402', 'means', ':', 'full', '.']);
    const m = trainBigram(['a b a c', 'a b']);
    expect(candidates(m, 'a', 1, 1).map((c) => [c.token, c.count, c.prob])).toEqual([
      ['b', 2, 2 / 3],
      ['c', 1, 1 / 3],
    ]);
    expect(detokenize(['error', 'e-402', 'means', ':', 'full', '.'])).toBe('error e-402 means: full.');
  });

  it('on the Lumen help center, "error" is followed by 7 different words, each seen once', () => {
    const m = trainBigram(corpus.docs.map((d) => d.text));
    const c = candidates(m, 'error', 1, 1);
    expect(c).toHaveLength(7);
    expect(c.every((x) => x.count === 1 && Math.abs(x.prob - 1 / 7) < 1e-12)).toBe(true);
    // Greedy decoding repeats itself; the seeded sample at T = 1 writes a fluent, false sentence.
    expect(detokenize(['the', ...generate(m, 'the', 6, 0, 1, 1).map((s) => s.token)])).toBe(
      'the end of the end of the',
    );
    expect(detokenize(['error', ...generate(m, 'error', 8, 1, 1, 1).map((s) => s.token)])).toBe(
      'error e-402 means your storage quota is lost.',
    );
  });
});
