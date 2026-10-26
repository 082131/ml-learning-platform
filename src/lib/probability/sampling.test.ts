import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { DISTRIBUTIONS, draw, expectedValue, sample, samplingExperiment, summarize } from './sampling';

describe('discrete distributions', () => {
  it('have probabilities that sum to 1 and the expected values worked out in the lesson', () => {
    for (const d of Object.values(DISTRIBUTIONS))
      expect(d.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(expectedValue(DISTRIBUTIONS.die!)).toBeCloseTo(3.5, 12); // (1 + … + 6) / 6
    expect(expectedValue(DISTRIBUTIONS.loaded!)).toBeCloseTo(4.5, 12); // 0.1·15 + 0.5·6
    expect(expectedValue(DISTRIBUTIONS.heads!)).toBeCloseTo(5, 12); // 10 · 0.5
    expect(DISTRIBUTIONS.heads!.probs[5]).toBeCloseTo(252 / 1024, 12); // C(10, 5) / 2¹⁰
  });

  it('draws by inverse CDF', () => {
    const loaded = DISTRIBUTIONS.loaded!;
    expect(draw(loaded, 0)).toBe(1);
    expect(draw(loaded, 0.15)).toBe(2);
    expect(draw(loaded, 0.49)).toBe(5);
    expect(draw(loaded, 0.5)).toBe(6);
    expect(draw(loaded, 0.999999)).toBe(6);
  });

  it('is reproducible for a seed and different for another', () => {
    const d = DISTRIBUTIONS.die!;
    expect(sample(d, 50, 7)).toEqual(sample(d, 50, 7));
    expect(sample(d, 50, 7)).not.toEqual(sample(d, 50, 8));
  });

  it('summarizes counts, frequencies and the mean (hand-worked)', () => {
    const s = summarize(DISTRIBUTIONS.die!, [1, 6, 6, 3]);
    expect(s.counts).toEqual([1, 0, 1, 0, 0, 2]);
    expect(s.mean).toBe(4); // 16 / 4
    expect(s.maxGap).toBeCloseTo(0.5 - 1 / 6, 12);
  });

  it('gets closer to the distribution as n grows (law of large numbers, for this seed)', () => {
    const d = DISTRIBUTIONS.loaded!;
    const gap = (n: number) => summarize(d, sample(d, n, 42)).maxGap;
    expect(gap(10000)).toBeLessThan(gap(100));
    expect(gap(10000)).toBeLessThan(0.02);
  });

  it('is a valid experiment', () =>
    expect(validateExperiment(samplingExperiment('t', { dist: 'die', logN: 2, seed: 1 }))).toEqual([]));
});
