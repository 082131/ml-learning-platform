import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed, pyThousands } from './format';

/**
 * How long a canary needs to detect a higher error rate, and how many extra failed requests the new version
 * causes before it is rolled back. A one-sided test against the known baseline rate at 5% significance and
 * 80% power (normal approximation). CANARY_SOURCE is the same model in Python, checked against CPython in
 * canary.test.ts; canary_sim.py in the lesson folder checks the power by simulation.
 */
export const Z_ALPHA = 1.6449; // one-sided 5%
export const Z_BETA = 0.8416; // 80% power

export interface CanaryState {
  /** Total requests per second. */
  rate: number;
  /** Percent of traffic sent to the new version. */
  share: number;
  /** Error rate of the current version, percent. */
  base: number;
  /** Error rate of the new version, percent. */
  canary: number;
  /** Minutes from the alarm until traffic is back on the old version. */
  rollback: number;
}

export interface CanaryResult {
  /** Requests the canary must serve before the test can tell, or null if there is nothing to detect. */
  n: number | null;
  /** Seconds to collect n canary requests. */
  detect: number;
  /** Extra failures (above the baseline rate) while detecting and while rolling back. */
  extraDetect: number;
  extraRollback: number;
  /** Alarm threshold: errors among n canary requests. */
  threshold: number;
}

export function sampleSize(p0: number, p1: number): number | null {
  if (p1 <= p0) return null;
  const z = Z_ALPHA * Math.sqrt(p0 * (1 - p0)) + Z_BETA * Math.sqrt(p1 * (1 - p1));
  return Math.ceil((z / (p1 - p0)) ** 2);
}

export function runCanary(s: CanaryState): CanaryResult {
  const p0 = s.base / 100;
  const p1 = s.canary / 100;
  const n = sampleSize(p0, p1);
  const canaryRate = (s.rate * s.share) / 100;
  if (n === null) return { n, detect: 0, extraDetect: 0, extraRollback: 0, threshold: 0 };
  const excess = p1 - p0;
  return {
    n,
    detect: n / canaryRate,
    extraDetect: n * excess,
    extraRollback: canaryRate * s.rollback * 60 * excess,
    threshold: n * p0 + Z_ALPHA * Math.sqrt(n * p0 * (1 - p0)),
  };
}

export const CANARY_SOURCE = `import math

rate, share = {{rate}}, {{share}} / 100          # requests/s, fraction sent to the new version
p0, p1 = {{base}} / 100, {{canary}} / 100        # error rates: current and new version
rollback_s = {{rollback}} * 60                   # from the alarm until traffic is back

if p1 <= p0:
    print("the new version is not worse: nothing to detect")
else:
    # Canary requests needed to notice p1 > p0 (one-sided test, 5% false alarms, 80% power)
    z = 1.6449 * math.sqrt(p0 * (1 - p0)) + 0.8416 * math.sqrt(p1 * (1 - p1))
    n = math.ceil((z / (p1 - p0)) ** 2)
    threshold = n * p0 + 1.6449 * math.sqrt(n * p0 * (1 - p0))   # alarm above this many errors

    detect_s = n / (rate * share)
    extra = n * (p1 - p0) + rate * share * rollback_s * (p1 - p0)
    print(f"alarm after {n:,} canary requests with more than {threshold:.1f} errors")
    print(f"detected after {detect_s / 60:.1f} min, rolled back after {(detect_s + rollback_s) / 60:.1f} min")
    print(f"extra failed requests: {extra:.0f}")`;

export const canarySlots = (s: CanaryState): Record<string, string> => ({
  rate: String(s.rate),
  share: String(s.share),
  base: String(Number(s.base.toFixed(1))),
  canary: String(Number(s.canary.toFixed(1))),
  rollback: String(s.rollback),
});

export function canaryPrintout(s: CanaryState, r: CanaryResult): string[] {
  if (r.n === null) return ['the new version is not worse: nothing to detect'];
  const rb = s.rollback * 60;
  return [
    `alarm after ${pyThousands(r.n)} canary requests with more than ${pyFixed(r.threshold, 1)} errors`,
    `detected after ${pyFixed(r.detect / 60, 1)} min, rolled back after ${pyFixed((r.detect + rb) / 60, 1)} min`,
    `extra failed requests: ${pyFixed(r.extraDetect + r.extraRollback, 0)}`,
  ];
}

export function canaryReadout(s: CanaryState, r: CanaryResult): ReadoutItem[] {
  if (r.n === null)
    return [
      {
        label: 'Result',
        value: 'The new version is not worse than the current one: there is no regression to detect.',
      },
    ];
  return [
    { label: 'What the code prints', value: canaryPrintout(s, r).join('\n') },
    {
      label: 'Extra failures, split',
      value: `${pyFixed(r.extraDetect, 1)} while the test collects evidence (fixed by the error rates, not the share), ${pyFixed(r.extraRollback, 1)} while rolling back (grows with the share).`,
    },
  ];
}

export function canaryExperiment(id: string, initial: CanaryState): ExperimentDef<CanaryState, CanaryResult> {
  const slider = (key: keyof CanaryState, label: string, min: number, max: number, step = 1) =>
    ({
      kind: 'slider',
      id: key,
      label,
      min,
      max,
      step,
      get: (s: CanaryState) => s[key],
      set: (s: CanaryState, v: number) => ({
        ...s,
        [key]: Number((Math.round(v / step) * step).toFixed(step < 1 ? 1 : 0)),
      }),
    }) as const;
  return {
    id,
    initial,
    controls: [
      slider('share', 'Traffic to the new version (%)', 1, 50),
      slider('canary', 'New version error rate (%)', 0.1, 5, 0.1),
      slider('base', 'Current error rate (%)', 0.1, 2, 0.1),
      slider('rate', 'Requests per second', 20, 2000, 20),
      slider('rollback', 'Minutes to roll back after the alarm', 0, 15),
    ],
    compute: runCanary,
    readout: canaryReadout,
  };
}
