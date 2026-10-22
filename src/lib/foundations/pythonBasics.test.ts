import { describe, expect, it } from 'vitest';
import { hasPython } from './pythonOracle';
import { BASICS_SOURCE, basicsOutput, basicsSlots, buildBasicsTrace, type BasicsState } from './pythonBasics';
import { fillTemplate } from './template';
import { expectTraceMatchesPython } from './traceCheck';

const start: BasicsState = { item: 'apples', price: 2.5, quantity: 3 };

describe('python-basics program', () => {
  it('computes the printed lines by hand', () => {
    // 2.5 · 3 = 7.5
    expect(basicsOutput(start)).toEqual([
      'apples x3 costs 7.5',
      "<class 'float'> <class 'int'> <class 'float'>",
    ]);
    // A whole float stays a float: 2.0 · 4 = 8.0
    expect(basicsOutput({ item: 'pears', price: 2, quantity: 4 })[0]).toBe('pears x4 costs 8.0');
    expect(basicsSlots({ ...start, price: 3 }).price).toBe('3.0');
  });
  it('records one step per line with the variables after it', () => {
    const t = buildBasicsTrace(start);
    expect(t.steps.map((s) => s.range.line)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(t.steps[3]!.vars.total).toEqual({ kind: 'text', value: '7.5' });
    expect(t.steps[0]!.vars.item).toEqual({ kind: 'text', value: "'apples'" });
  });
});

describe.skipIf(!hasPython)('python-basics against CPython', () => {
  const states: BasicsState[] = [
    start,
    { item: 'green tea', price: 20, quantity: 12 },
    { item: '', price: 0.5, quantity: 1 },
  ];
  it.each(states)('trace and output match Python for %o', (s) => {
    const program = fillTemplate(BASICS_SOURCE, basicsSlots(s));
    const py = expectTraceMatchesPython(buildBasicsTrace(s), program);
    expect(py.stdout.trimEnd().split('\n')).toEqual(basicsOutput(s));
  });
});
