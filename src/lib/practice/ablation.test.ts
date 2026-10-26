import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  ablationExperiment,
  COMPONENTS,
  computeAblation,
  makeRichDeliveries,
  printedLines,
  solve,
  verdict,
  type AblationState,
} from './ablation';

const all = Object.fromEntries(COMPONENTS.map((c) => [c, true])) as AblationState['used'];
const data = makeRichDeliveries();

// Expected lines were printed by the lesson's Python (CPython 3.13).
describe('ablation', () => {
  it('solves a small system by hand', () => {
    // 2a + b = 5, a + 3b = 10 → a = 1, b = 3
    expect(
      solve(
        [
          [2, 1],
          [1, 3],
        ],
        [5, 10],
      ),
    ).toEqual([1, 3]);
    // needs a row swap: 0a + b = 2, a + b = 3 → a = 1, b = 2
    expect(
      solve(
        [
          [0, 1],
          [1, 1],
        ],
        [2, 3],
      ),
    ).toEqual([1, 2]);
  });

  it('prints the Python ablation table and slices for the full baseline', () => {
    const s = { used: all, seeds: 5 };
    expect(printedLines(s, computeAblation(s, data))).toEqual([
      'model          val MAE over 5 seeds',
      'baseline       2.094 ± 0.182',
      '- distance     9.679 ± 0.977',
      '- stops        3.602 ± 0.396',
      '- rain         3.259 ± 0.391',
      '- region       3.617 ± 0.358',
      '- order_id     2.086 ± 0.165',
      'city   MAE 2.303 on 14 deliveries (seed 0)',
      'suburb MAE 2.062 on 17 deliveries (seed 0)',
      'rural  MAE 1.982 on 19 deliveries (seed 0)',
    ]);
  });

  it('without region the rural slice stands out', () => {
    const s = { used: { ...all, region: false }, seeds: 5 };
    expect(printedLines(s, computeAblation(s, data))).toEqual([
      'model          val MAE over 5 seeds',
      'baseline       3.617 ± 0.358',
      '- distance     9.952 ± 0.926',
      '- stops        4.182 ± 0.362',
      '- rain         4.277 ± 0.402',
      '- order_id     3.588 ± 0.325',
      'city   MAE 3.462 on 14 deliveries (seed 0)',
      'suburb MAE 2.288 on 17 deliveries (seed 0)',
      'rural  MAE 4.896 on 19 deliveries (seed 0)',
    ]);
  });

  it('calls the order_id removal noise and the distance removal real', () => {
    const r = computeAblation({ used: all, seeds: 5 }, data);
    const byName = (n: string) => r.rows.find((x) => x.removed === n)!;
    expect(verdict(r.rows[0]!, byName('order_id'))).toBe('within noise');
    expect(verdict(r.rows[0]!, byName('distance'))).toBe('helps');
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(ablationExperiment('a', { used: all, seeds: 5 }))).toEqual([]);
  });
});
