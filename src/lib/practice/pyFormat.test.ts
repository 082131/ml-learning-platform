import { describe, expect, it } from 'vitest';
import { pyFixed, pyFloat, pyJson, pyRound } from './pyFormat';

// Expected strings were printed by CPython 3.13.
describe('pyRound', () => {
  it('rounds like Python, including exact ties to even', () => {
    expect(pyRound(2.675, 2)).toBe(2.67); // 2.675 is stored just below 2.675
    expect(pyRound(0.03125)).toBe(0.0312); // an exact tie goes to the even digit
    expect(pyRound(1.00005)).toBe(1.0001);
    expect(pyRound(3.66071234)).toBe(3.6607);
    expect(pyRound(-3.66075)).toBe(-3.6608);
    expect(pyRound(0.00004)).toBe(0);
  });
});

describe('pyFloat and pyJson', () => {
  it('match repr and json.dumps', () => {
    expect(pyJson([0, -0, 1, 0.1, 0.0025, 31.1996, 1e15, Infinity, null, 'a"b'])).toBe(
      '[0.0, -0.0, 1.0, 0.1, 0.0025, 31.1996, 1000000000000000.0, Infinity, null, "a\\"b"]',
    );
    expect(pyJson({ seed: { int: 3 }, ok: true, m: { lr: 0.005 } })).toBe(
      '{"seed": 3, "ok": true, "m": {"lr": 0.005}}',
    );
    expect(pyFloat(NaN)).toBe('nan');
    expect(() => pyFloat(1e16)).toThrow();
  });
});

describe('pyFixed', () => {
  it('matches CPython 3.13 f-string formatting', () => {
    // print([f"{x:+.2f}" for x in (0.125, 0.375, -0.0, -0.001, 2.675, 0.0)], f"{1.005:.2f}", f"{-7.5:.0f}")
    expect([0.125, 0.375, -0, -0.001, 2.675, 0].map((x) => pyFixed(x, 2, true))).toEqual([
      '+0.12',
      '+0.38',
      '-0.00',
      '-0.00',
      '+2.67',
      '+0.00',
    ]);
    expect(pyFixed(1.005, 2)).toBe('1.00');
    expect(pyFixed(-7.5, 0)).toBe('-8');
  });
});
