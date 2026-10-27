import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  buildPearsonTrace,
  computeEda,
  edaExperiment,
  edaPrintout,
  edaReadout,
  edaSubset,
  handRows,
  handTrace,
  leastSquares,
  PEARSON_LOOP_SOURCE,
  pearsonSlots,
  pySum,
  round3,
  type EdaState,
} from './eda';
// Produced by fixtures/gen_eda.py (pandas 3.0.2): what the lesson's correlation code prints per (x, y).
import pandasOut from './fixtures/eda.json';
// Produced by fixtures/gen_eda_hand.py (CPython 3.13): [pure-Python loop output, pandas round(corr, 3)].
import handOut from './fixtures/eda_hand.json';
import type { NumericColumn } from './penguins';

const pairs = Object.keys(pandasOut).map((k) => {
  const [x, y] = k.split('/') as [NumericColumn, NumericColumn];
  return [k, { x, y }] as [string, EdaState];
});

describe('EDA correlations', () => {
  it.each(pairs)('prints what pandas prints for %s', (key, s) => {
    expect(edaPrintout(computeEda(s))).toBe(pandasOut[key as keyof typeof pandasOut]);
  });

  it('shows Simpson’s paradox for bill length vs bill depth: −0.235 overall, positive in every species', () => {
    const r = computeEda({ x: 'bill_length_mm', y: 'bill_depth_mm' });
    expect(r.groups.map((g) => [g.group, g.n, round3(g.r)])).toEqual([
      ['all', 342, '-0.235'],
      ['Adelie', 151, '0.391'],
      ['Chinstrap', 68, '0.654'],
      ['Gentoo', 123, '0.643'],
    ]);
    expect(edaReadout({ x: 'bill_length_mm', y: 'bill_depth_mm' }, r)[1]!.value).toContain('Simpson');
  });

  it.each(pairs)('the pure-Python loop prints as CPython for %s', (key, s) => {
    const [loop, pandas] = handOut[key as keyof typeof handOut];
    expect(round3(handTrace(s).r)).toBe(loop);
    expect(loop).toBe(pandas);
  });

  it('keeps the fixture loop in sync with the lesson source', () => {
    const file = readFileSync('src/lib/classical/fixtures/pearson_loop.py', 'utf8');
    expect(file.trimEnd()).toBe(PEARSON_LOOP_SOURCE);
  });

  it('uses every 12th row: 29 penguins, 6 of them Chinstrap', () => {
    expect(edaSubset()).toHaveLength(29);
    expect(handRows().map((p) => p.row)).toEqual([276, 288, 300, 312, 324, 336]);
    expect(pearsonSlots({ x: 'bill_length_mm', y: 'body_mass_g' }).ys).toBe(
      '[3500, 3700, 3300, 3850, 3250, 3950]',
    );
  });

  it('computes r and the line by hand: (1, 2), (2, 4), (3, 5)', () => {
    // mx = 2, my = 11/3; sxy = (−1)(−5/3) + 0 + (1)(4/3) = 3; sxx = 2; syy = 25/9 + 1/9 + 16/9 = 42/9
    const { r, trace } = buildPearsonTrace([1, 2, 3], [2, 4, 5]);
    expect(r).toBeCloseTo(3 / Math.sqrt(2 * (42 / 9)), 12);
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '0.982' });
    const fit = leastSquares([1, 2, 3], [2, 4, 5]);
    expect(fit.slope).toBeCloseTo(1.5, 12);
    expect(fit.intercept).toBeCloseTo(11 / 3 - 3, 12);
  });

  it('sums like CPython’s compensated sum()', () => {
    expect(pySum([0.1, 0.2, 0.3])).toBe(0.6); // plain left-to-right addition gives 0.6000000000000001
    expect(pySum([1e16, 1.5, -1e16])).toBe(1.5); // CPython 3.13: sum([1e16, 1.5, -1e16]) == 1.5
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(edaExperiment('x', 'loop'))).toEqual([]);
  });
});

describe('inline CSV subsets', () => {
  it('copy their rows verbatim from penguins.csv (minus year)', async () => {
    const { subsetCsv, cleaningSubset } = await import('./cleaning');
    const raw = readFileSync('src/lib/classical/data/penguins.csv', 'utf8').trim().split('\n');
    for (const rows of [edaSubset(), cleaningSubset()]) {
      const lines = subsetCsv(rows).trim().split('\n').slice(1);
      lines.forEach((line, i) => {
        const r = rows[i]!.row;
        expect(line).toBe(`${r},${raw[r + 1]!.replace(/,\d{4}$/, '')}`);
      });
    }
  });
});
