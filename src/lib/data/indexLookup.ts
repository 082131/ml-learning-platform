import type { Trace, TraceStep, TraceValue } from '../types';
import { array, scalar, text } from '../trace/values';

/**
 * Finding every order of one customer two ways: a full scan of the table, and a lookup in a sorted
 * index (binary search, then read forward while the key matches). Both count the entries they read.
 * The trace builders below follow LOOKUP_SOURCE line by line; lookup.test.ts checks their results
 * against the same code run with CPython 3.13.
 */
export const LOOKUP_SOURCE = `def scan(orders, target):
    touched = 0
    found = []
    for order_id, customer_id in orders:
        touched += 1
        if customer_id == target:
            found.append(order_id)
    return found, touched


def index_lookup(index, target):
    lo, hi = 0, len(index)
    touched = 0
    while lo < hi:
        mid = (lo + hi) // 2
        touched += 1
        if index[mid][0] < target:
            lo = mid + 1
        else:
            hi = mid
    found = []
    while lo < len(index):
        touched += 1
        customer_id, order_id = index[lo]
        if customer_id != target:
            break
        found.append(order_id)
        lo += 1
    return found, touched


orders = [(101 + i, (i * 5) % {{customers}} + 1) for i in range({{n}})]
index = sorted((c, o) for o, c in orders)
found, touched = {{call}}
print(found, touched)`;

export const LOOKUP_LINE = {
  scanFor: 4,
  scanTouch: 5,
  scanIf: 6,
  scanAppend: 7,
  scanReturn: 8,
  lohi: 12,
  touched0: 13,
  whileBin: 14,
  mid: 15,
  binTouch: 16,
  binIf: 17,
  lo: 18,
  hi: 20,
  found0: 21,
  whileRead: 22,
  readTouch: 23,
  read: 24,
  readIf: 25,
  brk: 26,
  readAppend: 27,
  readNext: 28,
  idxReturn: 29,
  orders: 32,
  index: 33,
  call: 34,
  print: 35,
} as const;

/** Distinct customer ids in the generated table: 1 to 8. */
export const LOOKUP_CUSTOMERS = 8;

export type LookupMethod = 'scan' | 'index';
type Row = [number, number];

/** The table the code generates: order i has id 101 + i and customer (i·5 mod 8) + 1. */
export const makeOrders = (n: number, customers = LOOKUP_CUSTOMERS): Row[] =>
  Array.from({ length: n }, (_, i) => [101 + i, ((i * 5) % customers) + 1]);

/** `sorted((c, o) for o, c in orders)`: (customer_id, order_id) pairs in key order. */
export const makeIndex = (orders: readonly Row[]): Row[] =>
  orders.map(([o, c]): Row => [c, o]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/** A Python list of ints as print() shows it. */
export const pyIntList = (xs: readonly number[]) => `[${xs.join(', ')}]`;

export const callFor = (method: LookupMethod, target: number) =>
  method === 'scan' ? `scan(orders, ${target})` : `index_lookup(index, ${target})`;

export interface LookupResult {
  found: number[];
  touched: number;
}

export function scanLookup(orders: readonly Row[], target: number): LookupResult {
  const found = orders.filter(([, c]) => c === target).map(([o]) => o);
  return { found, touched: orders.length };
}

/** Binary search for the first key ≥ target, then read forward. `touched` counts every entry read. */
export function indexLookup(index: readonly Row[], target: number): LookupResult & { probes: number } {
  let lo = 0;
  let hi = index.length;
  let probes = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes++;
    if (index[mid]![0] < target) lo = mid + 1;
    else hi = mid;
  }
  const found: number[] = [];
  let reads = 0;
  while (lo < index.length) {
    reads++;
    const [c, o] = index[lo]!;
    if (c !== target) break;
    found.push(o);
    lo++;
  }
  return { found, touched: probes + reads, probes };
}

const rowCells = (r: number) => [
  [r, 0],
  [r, 1],
];

function setupSteps(orders: Row[], index: Row[], n: number, method: LookupMethod, target: number) {
  const steps: TraceStep[] = [
    {
      range: { line: LOOKUP_LINE.orders },
      vars: { orders: array(orders) },
      note: `orders is the table: ${n} rows of (order_id, customer_id), in the order they were inserted.`,
    },
    {
      range: { line: LOOKUP_LINE.index },
      vars: { orders: array(orders), index: array(index) },
      note: 'index holds the same pairs as (customer_id, order_id), sorted by customer_id. Building it costs time and space once; every later lookup reuses it.',
    },
    {
      range: { line: LOOKUP_LINE.call },
      vars: { orders: array(orders), index: array(index) },
      note:
        method === 'scan'
          ? `Call scan for customer ${target}: it has to read the table itself.`
          : `Call index_lookup for customer ${target}: it searches the sorted index.`,
    },
  ];
  return steps;
}

/** The computed trace of LOOKUP_SOURCE for one method, table size and target customer. */
export function buildLookupTrace(n: number, method: LookupMethod, target: number): Trace {
  const orders = makeOrders(n);
  const index = makeIndex(orders);
  const steps = setupSteps(orders, index, n, method, target);
  const L = LOOKUP_LINE;
  const found: number[] = [];
  let touched = 0;
  const finish = (returnLine: number, vars: Record<string, TraceValue>) => {
    steps.push({
      range: { line: returnLine },
      vars,
      note: `Return ${pyIntList(found)} after reading ${touched} entr${touched === 1 ? 'y' : 'ies'}.`,
    });
    steps.push({
      range: { line: L.print },
      vars: {
        found: text(pyIntList(found)),
        touched: scalar(touched),
        output: text(`${pyIntList(found)} ${touched}`),
      },
      note: `print shows the matching order ids and the count: ${pyIntList(found)} ${touched}.`,
    });
  };

  if (method === 'scan') {
    const t = array(orders);
    const v = (extra: Record<string, TraceValue> = {}) => ({
      orders: t,
      target: scalar(target),
      touched: scalar(touched),
      found: text(pyIntList(found)),
      ...extra,
    });
    let loopVars: Record<string, TraceValue> = {};
    orders.forEach(([o, c], r) => {
      loopVars = { order_id: scalar(o), customer_id: scalar(c) };
      const hl = { orders: rowCells(r) };
      steps.push({
        range: { line: L.scanFor },
        vars: v(loopVars),
        note: `Read row ${r}: order ${o}, customer ${c}.`,
        highlight: hl,
      });
      touched++;
      steps.push({
        range: { line: L.scanTouch },
        vars: v(loopVars),
        note: `touched = ${touched}: every row costs a read, match or not.`,
        highlight: hl,
      });
      const hit = c === target;
      steps.push({
        range: { line: L.scanIf },
        vars: v(loopVars),
        note: hit
          ? `${c} == ${target}: a match.`
          : `${c} ≠ ${target}: not this customer, but the row was still read.`,
        highlight: hl,
      });
      if (hit) {
        found.push(o);
        steps.push({
          range: { line: L.scanAppend },
          vars: v(loopVars),
          note: `found = ${pyIntList(found)}.`,
          highlight: hl,
        });
      }
    });
    finish(L.scanReturn, v(loopVars));
    return { source: 'computed', steps };
  }

  const t = array(index);
  let lo = 0;
  let hi = index.length;
  const locals: Record<string, TraceValue> = {};
  const v = () => ({ index: t, target: scalar(target), lo: scalar(lo), hi: scalar(hi), ...locals });
  steps.push({ range: { line: L.lohi }, vars: v(), note: `Search the whole index: lo = 0, hi = ${hi}.` });
  locals.touched = scalar(touched);
  steps.push({ range: { line: L.touched0 }, vars: v(), note: 'Nothing read yet.' });
  while (lo < hi) {
    steps.push({
      range: { line: L.whileBin },
      vars: v(),
      note: `lo = ${lo} < hi = ${hi}: ${hi - lo} entries could still hold the first ${target}.`,
    });
    const mid = Math.floor((lo + hi) / 2);
    locals.mid = scalar(mid);
    const hl = { index: rowCells(mid) };
    steps.push({
      range: { line: L.mid },
      vars: v(),
      note: `Probe the middle: mid = (${lo} + ${hi}) // 2 = ${mid}.`,
      highlight: hl,
    });
    touched++;
    locals.touched = scalar(touched);
    steps.push({ range: { line: L.binTouch }, vars: v(), note: `touched = ${touched}.`, highlight: hl });
    const key = index[mid]![0];
    const less = key < target;
    steps.push({
      range: { line: L.binIf },
      vars: v(),
      note: less
        ? `index[${mid}] has customer ${key} < ${target}: the first ${target} must be to the right.`
        : `index[${mid}] has customer ${key} ≥ ${target}: the first ${target} is here or to the left.`,
      highlight: hl,
    });
    if (less) {
      lo = mid + 1;
      steps.push({
        range: { line: L.lo },
        vars: v(),
        note: `lo = ${lo}: half of the remaining entries are ruled out without reading them.`,
      });
    } else {
      hi = mid;
      steps.push({
        range: { line: L.hi },
        vars: v(),
        note: `hi = ${hi}: half of the remaining entries are ruled out without reading them.`,
      });
    }
  }
  locals.found = text(pyIntList(found));
  steps.push({
    range: { line: L.found0 },
    vars: v(),
    note: `lo = hi = ${lo}: the first entry with customer ≥ ${target} is at position ${lo}. Now read forward.`,
  });
  while (true) {
    const more = lo < index.length;
    steps.push({
      range: { line: L.whileRead },
      vars: v(),
      note: more ? `lo = ${lo} is inside the index.` : `lo = ${lo} is past the end of the index: stop.`,
    });
    if (!more) break;
    touched++;
    locals.touched = scalar(touched);
    const hl = { index: rowCells(lo) };
    steps.push({ range: { line: L.readTouch }, vars: v(), note: `touched = ${touched}.`, highlight: hl });
    const [c, o] = index[lo]!;
    locals.customer_id = scalar(c);
    locals.order_id = scalar(o);
    steps.push({ range: { line: L.read }, vars: v(), note: `index[${lo}] = (${c}, ${o}).`, highlight: hl });
    const stop = c !== target;
    steps.push({
      range: { line: L.readIf },
      vars: v(),
      note: stop
        ? `${c} ≠ ${target}: past the last match, and the index is sorted, so stop.`
        : `${c} == ${target}: a match.`,
      highlight: hl,
    });
    if (stop) {
      steps.push({
        range: { line: L.brk },
        vars: v(),
        note: 'Leave the loop. The rest of the index is never read.',
      });
      break;
    }
    found.push(o);
    locals.found = text(pyIntList(found));
    steps.push({
      range: { line: L.readAppend },
      vars: v(),
      note: `found = ${pyIntList(found)}.`,
      highlight: hl,
    });
    lo++;
    steps.push({ range: { line: L.readNext }, vars: v(), note: `lo = ${lo}: the next entry.` });
  }
  finish(L.idxReturn, v());
  return { source: 'computed', steps };
}
