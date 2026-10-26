import { describe, expect, it } from 'vitest';
import { pearson } from '../classical/stats';
import { validateExperiment } from '../experiment';
import { analyzeDays, confounderExperiment, DAYS_PER_SEASON, simulateDays } from './confounder';

describe('confounder simulation', () => {
  it('is reproducible for a seed and different across seeds', () => {
    expect(simulateDays(1, 3)).toEqual(simulateDays(1, 3));
    expect(simulateDays(1, 3)).not.toEqual(simulateDays(1, 4));
  });

  it('splits the days evenly into summer and winter', () => {
    const days = simulateDays(1, 1);
    expect(days.filter((d) => d.summer)).toHaveLength(DAYS_PER_SEASON);
    expect(days).toHaveLength(2 * DAYS_PER_SEASON);
  });

  it('shows a strong overall correlation that the season explains', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const res = analyzeDays(simulateDays(1, seed));
      expect(res.rAll).toBeGreaterThan(0.55);
      expect(Math.abs(res.rSummer)).toBeLessThan(0.45);
      expect(Math.abs(res.rWinter)).toBeLessThan(0.45);
    }
  });

  it('has no systematic correlation when summer has no effect', () => {
    const rs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => analyzeDays(simulateDays(0, seed)).rAll);
    expect(Math.abs(rs.reduce((a, b) => a + b, 0) / rs.length)).toBeLessThan(0.15);
  });

  it('reports r values that match pearson on the generated days', () => {
    const days = simulateDays(0.5, 7);
    const res = analyzeDays(days);
    expect(res.rAll).toBeCloseTo(
      pearson(
        days.map((d) => d.iceCream),
        days.map((d) => d.sunburn),
      ),
      12,
    );
  });

  it('is a valid experiment and shows within-season r only when split', () => {
    const def = confounderExperiment('c', { view: 'all', effect: 1, seed: 1 });
    expect(validateExperiment(def)).toEqual([]);
    const labels = (view: string) => {
      const s = { view, effect: 1, seed: 1 };
      return def.readout!(s, def.compute(s)).map((i) => i.label);
    };
    expect(labels('all')).not.toContain('r, summer days only');
    expect(labels('season')).toContain('r, summer days only');
  });
});
