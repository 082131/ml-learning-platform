import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from './format';

/**
 * Error-budget alerting on a simulated day, minute by minute (a stated model, not a measurement). Traffic is
 * constant; errors run at a low baseline except during one incident. Three alert rules are compared: a plain
 * threshold on the 5-minute error rate, and two multi-window burn-rate rules from the Google SRE workbook.
 * SLO_SOURCE is the same model in Python, checked against CPython in slo.test.ts.
 */
export const MINUTES = 1440;
export const START = 360; // the incident starts at 06:00
export const PER_MINUTE = 10_000; // requests per minute, constant
export const BASELINE = 2; // failed requests per minute normally: 0.02%
export const NAIVE = 0.01; // page if the 5-minute error rate is above 1%

export interface Rule {
  id: 'naive' | 'fast' | 'slow';
  label: string;
}

export const RULES: Rule[] = [
  { id: 'naive', label: '5-minute error rate above 1%' },
  { id: 'fast', label: 'Burn rate above 14.4 over 1 hour and 5 minutes' },
  { id: 'slow', label: 'Burn rate above 6 over 6 hours and 30 minutes' },
];

export interface SloState {
  /** Error rate during the incident, percent. */
  error: number;
  /** Incident length, minutes. */
  duration: number;
  /** SLO target, percent of requests that succeed (99, 99.5, 99.9). */
  target: string;
}

export interface SloResult {
  /** Failed requests in each minute (of PER_MINUTE). */
  errors: number[];
  budget: number;
  burn: number;
  /** Minutes after the incident started at which each rule first fires, or null. */
  fired: Record<Rule['id'], number | null>;
  /** Share of a 30-day error budget the incident consumed. */
  consumed: number;
}

export function errorCounts(s: SloState): number[] {
  const incident = Math.round(s.error * 100); // per 10,000 requests
  return Array.from({ length: MINUTES }, (_, t) =>
    t >= START && t < START + s.duration ? incident : BASELINE,
  );
}

export function runSlo(s: SloState): SloResult {
  const budget = 1 - Number(s.target) / 100;
  const errors = errorCounts(s);
  const prefix = [0];
  for (const e of errors) prefix.push(prefix.at(-1)! + e); // integers: exact
  // Error rate over the last w minutes ending at minute t (fewer at the start of the day).
  const mean = (t: number, w: number) => {
    const lo = Math.max(0, t + 1 - w);
    return (prefix[t + 1]! - prefix[lo]!) / ((t + 1 - lo) * PER_MINUTE);
  };
  const fired: SloResult['fired'] = { naive: null, fast: null, slow: null };
  for (let t = START; t < MINUTES; t++) {
    const after = t - START + 1; // minutes since the incident began, counting this one
    if (fired.naive === null && mean(t, 5) > NAIVE) fired.naive = after;
    if (fired.fast === null && mean(t, 60) / budget > 14.4 && mean(t, 5) / budget > 14.4) fired.fast = after;
    if (fired.slow === null && mean(t, 360) / budget > 6 && mean(t, 30) / budget > 6) fired.slow = after;
  }
  const incident = errors.slice(START, START + s.duration).reduce((a, b) => a + b, 0);
  return {
    errors,
    budget,
    burn: Math.round(s.error * 100) / PER_MINUTE / budget,
    fired,
    consumed: incident / (budget * 30 * MINUTES * PER_MINUTE),
  };
}

export const SLO_SOURCE = `budget = 1 - {{target}} / 100                 # the error budget: allowed share of failures
errors = [2] * 1440                              # failed requests per minute, of 10,000: 0.02% normally
incident = round({{error}} * 100)                # failures per 10,000 during the incident
for t in range(360, min(360 + {{duration}}, 1440)):
    errors[t] = incident                         # the incident starts at 06:00


def rate(t, w):                                  # error rate over the last w minutes, ending at minute t
    lo = max(0, t + 1 - w)
    return sum(errors[lo:t + 1]) / ((t + 1 - lo) * 10_000)


rules = {
    "5-min error rate > 1%": lambda t: rate(t, 5) > 0.01,
    "burn > 14.4 over 1 h and 5 min": lambda t: rate(t, 60) / budget > 14.4 and rate(t, 5) / budget > 14.4,
    "burn > 6 over 6 h and 30 min": lambda t: rate(t, 360) / budget > 6 and rate(t, 30) / budget > 6,
}
for name, fires in rules.items():
    t = next((t for t in range(360, 1440) if fires(t)), None)
    print(f"{name:32s} {'never' if t is None else f'after {t - 359} min'}")
consumed = sum(errors[360:360 + {{duration}}]) / (budget * 30 * 1440 * 10_000)
print(f"burn rate {incident / 10_000 / budget:.1f}, incident used {consumed:.1%} of the 30-day budget")`;

export const sloSlots = (s: SloState): Record<string, string> => ({
  target: s.target,
  duration: String(s.duration),
  error: String(s.error),
});

const NAMES: Record<Rule['id'], string> = {
  naive: '5-min error rate > 1%',
  fast: 'burn > 14.4 over 1 h and 5 min',
  slow: 'burn > 6 over 6 h and 30 min',
};

export const sloPrintout = (r: SloResult): string[] => [
  ...RULES.map(({ id }) => {
    const t = r.fired[id];
    return `${NAMES[id].padEnd(32, ' ')} ${t === null ? 'never' : `after ${t} min`}`;
  }),
  `burn rate ${pyFixed(r.burn, 1)}, incident used ${pyFixed(r.consumed * 100, 1)}% of the 30-day budget`,
];

export function sloReadout(_s: SloState, r: SloResult): ReadoutItem[] {
  const paged = RULES.filter((x) => r.fired[x.id] !== null).length;
  return [
    { label: 'What the code prints', value: sloPrintout(r).join('\n') },
    {
      label: 'Should someone be woken up?',
      value:
        r.consumed >= 0.02
          ? `Yes: ${pyFixed(r.consumed * 100, 1)}% of a month’s budget in one incident.${paged === 0 ? ' No rule fired.' : ''}`
          : `Probably not: ${pyFixed(r.consumed * 100, 1)}% of a month’s budget.${r.fired.naive !== null ? ' The plain threshold paged anyway.' : ''}`,
    },
  ];
}

export function sloExperiment(id: string, initial: SloState): ExperimentDef<SloState, SloResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'error',
        label: 'Error rate during the incident (%)',
        min: 0.1,
        max: 20,
        step: 0.1,
        get: (s) => s.error,
        set: (s, v) => ({ ...s, error: Number(v.toFixed(1)) }),
      },
      {
        kind: 'slider',
        id: 'duration',
        label: 'Incident length (minutes)',
        min: 1,
        max: 600,
        get: (s) => s.duration,
        set: (s, v) => ({ ...s, duration: v }),
      },
      {
        kind: 'select',
        id: 'target',
        label: 'SLO: requests that succeed',
        options: [
          { value: '99', label: '99%' },
          { value: '99.5', label: '99.5%' },
          { value: '99.9', label: '99.9%' },
        ],
        get: (s) => s.target,
        set: (s, v) => ({ ...s, target: v }),
      },
    ],
    compute: runSlo,
    readout: sloReadout,
  };
}
