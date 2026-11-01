import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  CANARY_SOURCE,
  canaryExperiment,
  canaryPrintout,
  canarySlots,
  runCanary,
  sampleSize,
  type CanaryState,
} from './canary';
import { hasPython, runPython } from './testPython';

const base: CanaryState = { rate: 200, share: 5, base: 0.5, canary: 1, rollback: 2 };

describe('runCanary', () => {
  it('needs 1,597 canary requests to tell 1% from 0.5%', () => {
    expect(sampleSize(0.005, 0.01)).toBe(1597);
    const r = runCanary(base);
    expect(r.detect).toBeCloseTo(159.7, 9); // 10 canary requests per second
    expect(r.extraDetect).toBeCloseTo(7.985, 9);
    expect(r.extraRollback).toBeCloseTo(10 * 120 * 0.005, 9);
  });
  it('the failures while detecting do not depend on the share', () => {
    expect(runCanary({ ...base, share: 1 }).extraDetect).toBeCloseTo(
      runCanary({ ...base, share: 50 }).extraDetect,
      12,
    );
  });
  it('reports nothing to detect when the new version is not worse', () => {
    expect(runCanary({ ...base, canary: 0.5 }).n).toBeNull();
  });
  it('slider values stay on one decimal', () => {
    const exp = canaryExperiment('c', base);
    const ctl = exp.controls.find((c) => c.id === 'canary');
    if (ctl?.kind !== 'slider') throw new Error('no slider');
    expect(ctl.set(base, 0.30000000000000004).canary).toBe(0.3);
    expect(validateExperiment(exp)).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: CanaryState[] = [
    base,
    { ...base, share: 1, rollback: 0 },
    { rate: 1980, share: 50, base: 2, canary: 2.1, rollback: 15 },
    { rate: 20, share: 3, base: 0.1, canary: 5, rollback: 7 },
    { ...base, canary: 0.3 },
    { ...base, base: 1.3, canary: 1.4 },
  ];
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(CANARY_SOURCE, [], canarySlots(s)).source)})`)
      .join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => canaryPrintout(s, runCanary(s))).join('\n'));
  });
  it('canary_sim.py still prints the recorded output', () => {
    const script = path.resolve(
      __dirname,
      '../../../content/tracks/inference/serving/apis-containers/canary_sim.py',
    );
    let out: string;
    try {
      out = execFileSync('python3', [script], { encoding: 'utf8' });
    } catch {
      return; // NumPy not installed
    }
    expect(out).toContain('p0 0.005 p1 0.010: n  1,597  alarm when worse 80.6%  false alarms 6.3%');
    expect(out).toContain('p0 0.005 p1 0.020: n    244  alarm when worse 72.1%  false alarms 3.6%');
    expect(out).toContain('p0 0.010 p1 0.015: n  2,830  alarm when worse 77.4%  false alarms 4.6%');
  });
});
