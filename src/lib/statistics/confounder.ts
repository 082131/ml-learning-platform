import { normal, seededRandom } from '../classical/random';
import { mean, pearson, std } from '../classical/stats';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';

/**
 * Simulated days of ice-cream sales and sunburn cases. Season drives both; within a season they are
 * generated independently, so any correlation across all days comes only through the season.
 */
export interface Day {
  id: number;
  summer: boolean;
  iceCream: number;
  sunburn: number;
}

export const DAYS_PER_SEASON = 40;

export interface ConfounderState {
  /** 'all' ignores the season; 'season' colors days by season and reports the within-season r. */
  view: string;
  /** How strongly summer raises both quantities, 0 (not at all) to 1. */
  effect: number;
  seed: number;
}

export interface ConfounderResult {
  days: Day[];
  rAll: number;
  rSummer: number;
  rWinter: number;
  iceMean: number;
  iceStd: number;
}

/** The simulation: summer adds 24 · effect sales and 6 · effect sunburns on top of independent noise (floored at 0). */
export function simulateDays(effect: number, seed: number): Day[] {
  const rand = seededRandom(seed);
  return Array.from({ length: 2 * DAYS_PER_SEASON }, (_, id) => {
    const summer = id < DAYS_PER_SEASON;
    const s = summer ? effect : 0;
    return {
      id,
      summer,
      iceCream: Math.max(0, 60 + 24 * s + 8 * normal(rand)),
      sunburn: Math.max(0, 6 + 6 * s + 2 * normal(rand)),
    };
  });
}

const r = (days: Day[]) =>
  pearson(
    days.map((d) => d.iceCream),
    days.map((d) => d.sunburn),
  );

export function analyzeDays(days: Day[]): ConfounderResult {
  const ice = days.map((d) => d.iceCream);
  return {
    days,
    rAll: r(days),
    rSummer: r(days.filter((d) => d.summer)),
    rWinter: r(days.filter((d) => !d.summer)),
    iceMean: mean(ice),
    iceStd: std(ice),
  };
}

export function confounderExperiment(
  id: string,
  initial: ConfounderState,
): ExperimentDef<ConfounderState, ConfounderResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'view',
        label: 'Season',
        options: [
          { value: 'all', label: 'Ignore the season' },
          { value: 'season', label: 'Split by season' },
        ],
        get: (s) => s.view,
        set: (s, view) => ({ ...s, view }),
      },
      {
        kind: 'slider',
        id: 'effect',
        label: 'How much summer raises both',
        min: 0,
        max: 1,
        step: 0.25,
        get: (s) => s.effect,
        set: (s, effect) => ({ ...s, effect }),
        format: (v) => `${Math.round(v * 100)}%`,
      },
      {
        kind: 'number',
        id: 'seed',
        label: 'Seed',
        min: 0,
        max: 9999,
        step: 1,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed: Math.round(seed) }),
      },
    ],
    compute: (s) => analyzeDays(simulateDays(s.effect, s.seed)),
    readout: (s, res) => [
      { label: 'Correlation r, all 80 days', value: formatNumber(res.rAll) },
      ...(s.view === 'season'
        ? [
            { label: 'r, summer days only', value: formatNumber(res.rSummer) },
            { label: 'r, winter days only', value: formatNumber(res.rWinter) },
          ]
        : []),
      { label: 'Mean daily ice-cream sales', value: formatNumber(res.iceMean) },
      { label: 'Standard deviation of sales', value: formatNumber(res.iceStd) },
    ],
  };
}
