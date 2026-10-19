import type { ExperimentDef } from '../types';
import {
  LOOKUP_CUSTOMERS,
  buildLookupTrace,
  callFor,
  indexLookup,
  makeIndex,
  makeOrders,
  pyIntList,
  scanLookup,
  type LookupMethod,
} from './indexLookup';

export interface LookupState {
  n: number;
  target: number;
  method: LookupMethod;
}

export interface LookupResult {
  found: number[];
  scanTouched: number;
  indexTouched: number;
  probes: number;
}

export const LOOKUP_MIN_ROWS = 4;
export const LOOKUP_MAX_ROWS = 32;

export const lookupSlots = (s: LookupState) => ({
  n: String(s.n),
  customers: String(LOOKUP_CUSTOMERS),
  call: callFor(s.method, s.target),
});

/**
 * Full scan vs index lookup on a generated orders table. Both methods are always computed, so the
 * readout compares them; the trace follows the selected one through LOOKUP_SOURCE.
 */
export function lookupExperiment(
  id: string,
  initial: LookupState,
  traceExample: string,
): ExperimentDef<LookupState, LookupResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'n',
        label: 'Rows in orders (n)',
        min: LOOKUP_MIN_ROWS,
        max: LOOKUP_MAX_ROWS,
        get: (s) => s.n,
        set: (s, v) => ({ ...s, n: v }),
      },
      {
        kind: 'slider',
        id: 'target',
        label: 'Customer to look up',
        min: 1,
        max: LOOKUP_CUSTOMERS + 1,
        get: (s) => s.target,
        set: (s, v) => ({ ...s, target: v }),
      },
      {
        kind: 'select',
        id: 'method',
        label: 'Method to step through',
        options: [
          { value: 'scan', label: 'Full scan: scan(orders, …)' },
          { value: 'index', label: 'Index lookup: index_lookup(index, …)' },
        ],
        get: (s) => s.method,
        set: (s, v) => ({ ...s, method: v as LookupMethod }),
      },
    ],
    compute: (s) => {
      const orders = makeOrders(s.n);
      const scan = scanLookup(orders, s.target);
      const idx = indexLookup(makeIndex(orders), s.target);
      return { found: scan.found, scanTouched: scan.touched, indexTouched: idx.touched, probes: idx.probes };
    },
    trace: (s) => buildLookupTrace(s.n, s.method, s.target),
    traceExample,
    readout: (s, r) => [
      {
        label: `Python: print(found, touched) for ${s.method === 'scan' ? 'scan' : 'index_lookup'}`,
        value: `${pyIntList(r.found)} ${s.method === 'scan' ? r.scanTouched : r.indexTouched}`,
      },
      { label: 'Full scan: entries read', value: `${r.scanTouched} (every row)` },
      {
        label: 'Index lookup: entries read',
        value: `${r.indexTouched} = ${r.probes} binary-search probes + ${r.indexTouched - r.probes} read forward`,
      },
    ],
  };
}
