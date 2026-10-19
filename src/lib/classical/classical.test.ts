import { describe, expect, it } from 'vitest';
import { column, complete, NUMERIC_COLUMNS, parsePenguins, PENGUINS } from './penguins';
import { bootstrapIndices, normal, seededRandom, shuffled } from './random';
import { mean, median, pearson, quantile, std, variance } from './stats';

describe('stats', () => {
  it('matches hand-worked values on [1, 2, 3, 4]', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    // Squared deviations 2.25 + 0.25 + 0.25 + 2.25 = 5: 5/4 = 1.25 (NumPy), 5/3 (pandas, ddof = 1)
    expect(variance([1, 2, 3, 4])).toBe(1.25);
    expect(variance([1, 2, 3, 4], 1)).toBeCloseTo(5 / 3, 12);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    // np.quantile([1, 2, 3, 4], 0.25): position 0.75 between 1 and 2 → 1.75
    expect(quantile([4, 1, 3, 2], 0.25)).toBe(1.75);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('computes Pearson r: +1 for a rising line, −1 for a falling one', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNaN();
  });

  it('refuses empty input and bad arguments', () => {
    expect(() => mean([])).toThrow('empty');
    expect(() => variance([1], 1)).toThrow('more than 1');
    expect(() => quantile([1], 2)).toThrow('between 0 and 1');
    expect(() => pearson([1], [1, 2])).toThrow('same length');
  });
});

describe('seeded randomness', () => {
  it('repeats exactly for the same seed and differs for another', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(seededRandom(43)()).not.toBe(xs[0]);
  });

  it('shuffles into a permutation without touching the input', () => {
    const input = [0, 1, 2, 3, 4, 5, 6, 7];
    const out = shuffled(input, seededRandom(1));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(shuffled(input, seededRandom(1))).toEqual(out);
  });

  it('draws normals with mean near 0 and standard deviation near 1', () => {
    const rand = seededRandom(7);
    const xs = Array.from({ length: 20000 }, () => normal(rand));
    expect(Math.abs(mean(xs))).toBeLessThan(0.03);
    expect(Math.abs(std(xs) - 1)).toBeLessThan(0.03);
  });

  it('bootstraps indices in range', () => {
    const idx = bootstrapIndices(5, 100, seededRandom(3));
    expect(idx).toHaveLength(100);
    expect(idx.every((i) => Number.isInteger(i) && i >= 0 && i < 5)).toBe(true);
  });
});

describe('penguins dataset', () => {
  it('has the shape and missing values pandas reports', () => {
    // pd.read_csv('penguins.csv'): shape (344, 8); isna().sum(): 2 per measurement column, 11 for sex
    expect(PENGUINS).toHaveLength(344);
    for (const c of NUMERIC_COLUMNS) expect(PENGUINS.filter((p) => p[c] === null)).toHaveLength(2);
    expect(PENGUINS.filter((p) => p.sex === null)).toHaveLength(11);
    expect(complete(PENGUINS, [...NUMERIC_COLUMNS, 'sex'])).toHaveLength(333);
  });

  it('matches pandas statistics for body_mass_g (pandas 3.0.2)', () => {
    const bm = column(PENGUINS, 'body_mass_g');
    expect(bm).toHaveLength(342);
    expect(mean(bm)).toBeCloseTo(4201.754385964912, 9);
    expect(median(bm)).toBe(4050);
    expect(std(bm, 1)).toBeCloseTo(801.9545356980955, 9);
    expect(quantile(bm, 0.25)).toBe(3550);
    expect(quantile(bm, 0.75)).toBe(4750);
    const both = complete(PENGUINS, ['flipper_length_mm', 'body_mass_g']);
    expect(pearson(column(both, 'flipper_length_mm'), column(both, 'body_mass_g'))).toBeCloseTo(
      0.8712017673060116,
      12,
    );
  });

  it('parses the first rows as written in the file', () => {
    expect(PENGUINS[0]).toEqual({
      row: 0,
      species: 'Adelie',
      island: 'Torgersen',
      bill_length_mm: 39.1,
      bill_depth_mm: 18.7,
      flipper_length_mm: 181,
      body_mass_g: 3750,
      sex: 'male',
      year: 2007,
    });
    expect(PENGUINS[3]!.bill_length_mm).toBeNull();
    expect(() => parsePenguins('a,b\n1,2')).toThrow('header');
  });
});
