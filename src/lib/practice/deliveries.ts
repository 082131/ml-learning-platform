import { LCG } from './lcg';

/**
 * The chapter's running example: how many minutes a delivery takes for a given distance. The data
 * is synthetic, so the true rule is known: minutes = 8 + 3 · km + noise, with noise uniform in
 * [−6, 6). Mirrors `make_deliveries` in the lesson code.
 */
export interface Delivery {
  km: number;
  minutes: number;
}

export const DATA_SEED = 2024;
export const DATA_ROWS = 60;
export const TRUE_INTERCEPT = 8;
export const TRUE_SLOPE = 3;
const MIN_KM = 0.5;
const KM_RANGE = 14.5;
const NOISE_WIDTH = 12;

export function makeDeliveries(n = DATA_ROWS, seed = DATA_SEED): Delivery[] {
  const rng = new LCG(seed);
  const rows: Delivery[] = [];
  for (let i = 0; i < n; i++) {
    const km = MIN_KM + KM_RANGE * rng.random();
    const minutes = TRUE_INTERCEPT + TRUE_SLOPE * km + (NOISE_WIDTH * rng.random() - NOISE_WIDTH / 2);
    rows.push({ km, minutes });
  }
  return rows;
}
