import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { SLO_SOURCE, runSlo, sloExperiment, sloPrintout, sloSlots, type SloState } from './slo';
import { hasPython, runPython } from './testPython';

const outage: SloState = { error: 5, duration: 30, target: '99.9' };

describe('runSlo', () => {
  it('a 5% outage against a 99.9% SLO burns budget 50 times too fast', () => {
    const r = runSlo(outage);
    expect(r.burn).toBeCloseTo(50, 9);
    // 30 minutes at 5% of 10,000 requests, against 0.1% of 30 days of traffic
    expect(r.consumed).toBeCloseTo((30 * 500) / (0.001 * 30 * 1440 * 10_000), 12);
  });
  it('the fast rule waits for the 1-hour window: 18 minutes for a 5% outage', () => {
    // 60-minute rate > 1.44%: 500k + 2(60 − k) > 8640, so k ≥ 18
    expect(runSlo(outage).fired.fast).toBe(18);
    expect(runSlo(outage).fired.naive).toBe(1);
  });
  it('a slow burn below 1% never trips the plain threshold but trips the slow rule', () => {
    const r = runSlo({ error: 0.8, duration: 600, target: '99.9' });
    expect(r.fired.naive).toBeNull();
    expect(r.fired.slow).not.toBeNull();
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(sloExperiment('s', outage))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: SloState[] = [
    outage,
    { error: 20, duration: 2, target: '99.9' },
    { error: 0.8, duration: 600, target: '99.9' },
    { error: 0.3, duration: 600, target: '99.5' },
    { error: 1.5, duration: 120, target: '99' },
    { error: 14.4, duration: 1, target: '99' },
    { error: 0.1, duration: 1, target: '99.9' },
  ];
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(SLO_SOURCE, [], sloSlots(s)).source)})`)
      .join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => sloPrintout(runSlo(s))).join('\n'));
  });
});
