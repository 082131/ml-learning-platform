import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import { HPA_SOURCE, demandAt, hpaExperiment, hpaPrintout, hpaSlots, runHpa, type HpaState } from './hpa';

const base: HpaState = { peak: 400, coldStart: 120, target: 70, minReplicas: 2, window: 300 };

describe('runHpa', () => {
  it('ramps demand from 60 to the peak over minutes 5 to 10', () => {
    expect(demandAt(450, 400)).toBe(230); // 60 + 340 · 150/300
    expect(demandAt(1650, 400)).toBe(230);
  });
  it('the first scale-up follows the formula: 2 ready pods at 100% CPU, target 70%', () => {
    // At t = 0: 60 rps on 2 pods is 60% utilization; 60/70 = 0.857, outside the tolerance:
    // ceil(2 · 60 / 70) = 2, so no change. Later, saturated at 100%: ceil(2 · 100 / 70) = 3.
    const r = runHpa(base);
    expect(r.replicas[0]).toBe(2);
    expect(Math.max(...r.replicas)).toBe(r.peakReplicas);
  });
  it('a longer cold start leaves more requests beyond capacity', () => {
    expect(runHpa({ ...base, coldStart: 300 }).overPct).toBeGreaterThan(runHpa({ ...base, coldStart: 30 }).overPct);
  });
  it('enough minimum replicas for the peak means nothing is ever over capacity', () => {
    expect(runHpa({ ...base, peak: 300, minReplicas: 8 }).overPct).toBe(0);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(hpaExperiment('h', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: HpaState[] = [
    base,
    { ...base, coldStart: 15 },
    { ...base, coldStart: 600, peak: 600 },
    { ...base, window: 0, target: 50 },
    { ...base, minReplicas: 8, peak: 300 },
    { peak: 100, coldStart: 45, target: 90, minReplicas: 1, window: 600 },
    { peak: 550, coldStart: 240, target: 60, minReplicas: 3, window: 120 },
  ];
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(HPA_SOURCE, [], hpaSlots(s)).source)}, {})`)
      .join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => hpaPrintout(runHpa(s))).join('\n'));
  });
});
