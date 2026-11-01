import type { ExperimentDef } from '../types';
import { seededRandom } from '../classical/random';

/**
 * A canary release of a new prompt version, simulated hour by hour with seeded randomness. Each request
 * goes to the new version with probability `share`; each answer is "bad" (thumbs down, failed check) with
 * the version's true rate. An alert compares the two observed rates; the true rates are inputs, stated in
 * the lesson, and every count is computed.
 */

export type CanaryScenario = 'same' | 'regression' | 'big-regression';

export const BASE_BAD_RATE = 0.05;
export const NEW_BAD_RATE: Record<CanaryScenario, number> = {
  same: 0.05,
  regression: 0.08,
  'big-regression': 0.15,
};
export const REQUESTS_PER_HOUR = 1000;
export const HOURS = 24;
/** Don't judge the new version on fewer answers than this. */
export const MIN_SAMPLES = 200;
/** One-sided z threshold (about a 1% false alarm rate per check, before repeated checking). */
export const Z_ALERT = 2.33;

export interface CanaryState {
  scenario: CanaryScenario;
  /** Share of traffic sent to the new version, 0 to 1. */
  share: number;
  /** Roll back automatically when the alert fires. */
  autoRollback: boolean;
  seed: number;
}

export interface HourStats {
  hour: number;
  baseN: number;
  baseBad: number;
  newN: number;
  newBad: number;
  /** Cumulative observed bad rates up to and including this hour. */
  baseRate: number;
  newRate: number;
  z: number;
  alert: boolean;
}

export interface CanaryResult {
  hours: HourStats[];
  /** First hour (1-based) at which the alert fired, if it did. */
  alertHour?: number;
  /** Bad answers from the new version beyond what the old version would have given. */
  excessBad: number;
  newRequests: number;
}

function binomial(n: number, p: number, rand: () => number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand() < p) k++;
  return k;
}

/** Two-proportion z statistic for "the new rate is higher", with the pooled rate. */
export function twoProportionZ(bad1: number, n1: number, bad2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0;
  const p = (bad1 + bad2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se === 0 ? 0 : (bad2 / n2 - bad1 / n1) / se;
}

export function simulateCanary(s: CanaryState): CanaryResult {
  const rand = seededRandom(s.seed);
  const pNew = NEW_BAD_RATE[s.scenario];
  const hours: HourStats[] = [];
  let [bn, bb, nn, nb] = [0, 0, 0, 0];
  let alertHour: number | undefined;
  let excess = 0;
  for (let h = 1; h <= HOURS; h++) {
    const share = alertHour && s.autoRollback ? 0 : s.share;
    const newN = binomial(REQUESTS_PER_HOUR, share, rand);
    const baseN = REQUESTS_PER_HOUR - newN;
    const baseBad = binomial(baseN, BASE_BAD_RATE, rand);
    const newBad = binomial(newN, pNew, rand);
    [bn, bb, nn, nb] = [bn + baseN, bb + baseBad, nn + newN, nb + newBad];
    excess += newN * (pNew - BASE_BAD_RATE);
    const z = twoProportionZ(bb, bn, nb, nn);
    const alert = nn >= MIN_SAMPLES && z > Z_ALERT;
    if (alert && alertHour === undefined) alertHour = h;
    hours.push({
      hour: h,
      baseN,
      baseBad,
      newN,
      newBad,
      baseRate: bn ? bb / bn : 0,
      newRate: nn ? nb / nn : 0,
      z,
      alert,
    });
  }
  return { hours, alertHour, excessBad: excess, newRequests: nn };
}

export const SHARE_STEPS = [0.01, 0.05, 0.1, 0.25, 0.5] as const;

export function canaryExperiment(id: string, initial: CanaryState): ExperimentDef<CanaryState, CanaryResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'scenario',
        label: 'New version’s true bad-answer rate',
        options: [
          { value: 'same', label: '5% (same as now)' },
          { value: 'regression', label: '8% (a regression)' },
          { value: 'big-regression', label: '15% (a bad regression)' },
        ],
        get: (s) => s.scenario,
        set: (s, v) => ({ ...s, scenario: v as CanaryScenario }),
      },
      {
        kind: 'slider',
        id: 'share',
        label: 'Traffic to the new version',
        min: 0,
        max: SHARE_STEPS.length - 1,
        format: (v) => `${SHARE_STEPS[Math.round(v)]! * 100}%`,
        get: (s) => Math.max(0, SHARE_STEPS.indexOf(s.share as (typeof SHARE_STEPS)[number])),
        set: (s, v) => ({ ...s, share: SHARE_STEPS[Math.round(v)]! }),
      },
      {
        kind: 'select',
        id: 'autoRollback',
        label: 'Roll back automatically on alert',
        options: [
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ],
        get: (s) => (s.autoRollback ? 'on' : 'off'),
        set: (s, v) => ({ ...s, autoRollback: v === 'on' }),
      },
      {
        kind: 'number',
        id: 'seed',
        label: 'Random seed',
        min: 1,
        max: 99,
        get: (s) => s.seed,
        set: (s, v) => ({ ...s, seed: Math.min(99, Math.max(1, Math.round(v))) }),
      },
    ],
    compute: simulateCanary,
    readout: (_s, r) => [
      {
        label: 'Alert',
        value: r.alertHour ? `fired in hour ${r.alertHour}` : 'did not fire in 24 hours',
        status: r.alertHour ? 'error' : 'ok',
      },
      { label: 'Requests served by the new version', value: r.newRequests.toLocaleString('en-US') },
      { label: 'Extra bad answers users received (expected)', value: Math.round(r.excessBad).toLocaleString('en-US') },
    ],
  };
}
