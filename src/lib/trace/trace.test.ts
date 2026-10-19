import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { buildRunningSumTrace, RUNNING_SUM_SOURCE } from './runningSum';
import { array, changesFrom, formatNumber, formatValue, removedFrom, scalar, text } from './values';

describe('trace values', () => {
  it('infers shapes for 1-D and 2-D arrays and rejects ragged ones', () => {
    expect(array([1, 2, 3])).toEqual({ kind: 'array', shape: [3], data: [1, 2, 3] });
    expect(
      array([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toMatchObject({ shape: [2, 3] });
    expect(() => array([[1], [2, 3]])).toThrow(/rectangular/);
  });

  it('marks new, changed and unchanged variables, and lists removed ones', () => {
    const a = { range: { line: 1 }, note: '', vars: { x: scalar(1), y: scalar(2) } };
    const b = { range: { line: 2 }, note: '', vars: { x: scalar(1), y: scalar(3), z: text('hi') } };
    expect(changesFrom(undefined, a)).toEqual({ x: 'new', y: 'new' });
    expect(changesFrom(a, b)).toEqual({ x: 'same', y: 'changed', z: 'new' });
    expect(removedFrom(b, a)).toEqual(['z']);
  });

  it('formats numbers and values the way Python prints them, rounded to 4 decimals', () => {
    expect([
      formatNumber(3),
      formatNumber(0.1 + 0.2),
      formatNumber(2.5),
      formatNumber(NaN),
      formatNumber(-Infinity),
    ]).toEqual(['3', '0.3', '2.5', 'NaN', '-Infinity']);
    expect(
      formatValue(
        array([
          [1, 2],
          [3, 4.25],
        ]),
      ),
    ).toBe('[[1, 2], [3, 4.25]]');
    expect(formatValue(text('done'))).toBe('done');
  });
});

describe('buildRunningSumTrace', () => {
  it('matches the hand-worked sum of [3, 1, 4]: totals 0, 3, 4, 8', () => {
    const trace = buildRunningSumTrace([3, 1, 4]);
    expect(trace.source).toBe('computed');
    expect(trace.steps.map((s) => s.range.line)).toEqual([1, 2, 3, 4, 3, 4, 3, 4, 5]);
    const totals = trace.steps.filter((s) => s.range.line === 4).map((s) => s.vars.total);
    expect(totals).toEqual([scalar(3), scalar(4), scalar(8)]);
    expect(trace.steps.at(-1)?.vars.output).toEqual(text('8'));
    expect(trace.steps[3]?.note).toBe('Add x to the total: 0 + 3 = 3.');
  });

  it('fits the filled source it steps through', () => {
    const xs = [3, 1, 4];
    const { source } = fillSlots(RUNNING_SUM_SOURCE, [], { xs: JSON.stringify(xs).replaceAll(',', ', ') });
    expect(validateTrace(buildRunningSumTrace(xs), source)).toEqual([]);
    expect(validateTrace(buildRunningSumTrace([]), source)).toEqual([]);
  });
});
