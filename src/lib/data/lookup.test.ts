import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import {
  buildLookupTrace,
  indexLookup,
  LOOKUP_SOURCE,
  makeIndex,
  makeOrders,
  pyIntList,
  scanLookup,
} from './indexLookup';
import { LOOKUP_MAX_ROWS, LOOKUP_MIN_ROWS, lookupExperiment, lookupSlots } from './lookupExperiment';
import python from './fixtures/lookup-python.json';

describe('scan and index lookup', () => {
  it('builds the table and index the Python code builds', () => {
    expect(makeOrders(4)).toEqual([
      [101, 1],
      [102, 6],
      [103, 3],
      [104, 8],
    ]);
    expect(makeIndex(makeOrders(4))).toEqual([
      [1, 101],
      [3, 103],
      [6, 102],
      [8, 104],
    ]);
  });

  it('agrees with CPython for every size and target in the lesson', () => {
    const table = python as unknown as Record<string, [[number[], number], [number[], number]]>;
    for (let n = LOOKUP_MIN_ROWS; n <= LOOKUP_MAX_ROWS; n++)
      for (let t = 1; t <= 9; t++) {
        const orders = makeOrders(n);
        const [[scanFound, scanTouched], [idxFound, idxTouched]] = table[`${n},${t}`]!;
        expect(scanLookup(orders, t)).toEqual({ found: scanFound, touched: scanTouched });
        const idx = indexLookup(makeIndex(orders), t);
        expect({ found: idx.found, touched: idx.touched }).toEqual({ found: idxFound, touched: idxTouched });
        for (const method of ['scan', 'index'] as const) {
          const last = buildLookupTrace(n, method, t).steps.at(-1)!;
          const [f, k] = method === 'scan' ? [scanFound, scanTouched] : [idxFound, idxTouched];
          expect(last.vars.output).toEqual({ kind: 'text', value: `${pyIntList(f)} ${k}` });
        }
      }
  });

  it('counts a hand-worked binary search: 16 rows, customer 3', () => {
    // index keys: 1,1,2,2,3,3,4,4,... Probes: mid 8 (key 5 ≥ 3), 4 (3 ≥ 3), 2 (2 < 3), 3 (2 < 3) → lo = 4.
    // Reads forward: index[4] = 3 ✓, index[5] = 3 ✓, index[6] = 4 ✗. 4 probes + 3 reads = 7.
    const idx = indexLookup(makeIndex(makeOrders(16)), 3);
    expect(idx).toEqual({ found: [103, 111], touched: 7, probes: 4 });
  });

  it('produces valid traces against the filled source', () => {
    const def = lookupExperiment('lookup', { n: 16, target: 3, method: 'index' }, 'lookup-code');
    expect(validateExperiment(def)).toEqual([]);
    for (const method of ['scan', 'index'] as const) {
      const s = { n: 9, target: 9, method };
      const { source } = fillSlots(LOOKUP_SOURCE, [], lookupSlots(s));
      expect(validateTrace(def.trace!(s), source)).toEqual([]);
    }
  });
});
