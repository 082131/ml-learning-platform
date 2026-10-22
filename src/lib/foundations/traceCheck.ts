// Test helper: compares a computed trace with the trace CPython records for the same program.
import { expect } from 'vitest';
import { formatValue } from '../trace/values';
import type { Trace } from '../types';
import { recordReprTrace } from './pythonOracle';

/** The computed trace must have Python's lines in Python's order, with repr() of every variable. */
export function expectTraceMatchesPython(trace: Trace, program: string) {
  const py = recordReprTrace(program);
  expect(trace.steps.map((s) => s.range.line)).toEqual(py.steps.map((s) => s.line));
  trace.steps.forEach((s, i) => {
    const vars = Object.fromEntries(Object.entries(s.vars).map(([k, v]) => [k, formatValue(v)]));
    expect(vars, `step ${i + 1} (line ${s.range.line})`).toEqual(py.steps[i]!.vars);
  });
  return py;
}
