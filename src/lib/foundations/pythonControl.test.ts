import { describe, expect, it } from 'vitest';
import { hasPython } from './pythonOracle';
import {
  CONTROL_SOURCE,
  buildControlTrace,
  computeControl,
  controlSlots,
  parseScores,
  type ControlState,
} from './pythonControl';
import { fillTemplate } from './template';
import { expectTraceMatchesPython } from './traceCheck';

const start: ControlState = { scores: '72, 45, 90, 61', passMark: 60 };

describe('python-control program', () => {
  it('grades by hand', () => {
    // 72 ≥ 60 pass, 45 fail, 90 pass, 61 pass → 3 of 4
    expect(computeControl(start)).toMatchObject({
      grades: ['pass', 'fail', 'pass', 'pass'],
      passed: 3,
      output: '3 of 4 passed',
    });
    expect(parseScores('5, x, 101, 100,,7, 8, 9, 10, 11')).toEqual([5, 100, 7, 8, 9, 10]);
  });
  it('steps into the function on every call', () => {
    const lines = buildControlTrace({ scores: '45', passMark: 60 }).steps.map((s) => s.range.line);
    expect(lines).toEqual([1, 6, 7, 8, 9, 2, 4, 10, 11, 9, 13]);
  });
});

describe.skipIf(!hasPython)('python-control against CPython', () => {
  const states: ControlState[] = [
    start,
    { scores: '', passMark: 50 },
    { scores: '100, 0, 60', passMark: 60 },
    { scores: '10', passMark: 0 },
  ];
  it.each(states)('trace and output match Python for %o', (s) => {
    const program = fillTemplate(CONTROL_SOURCE, controlSlots(s));
    const py = expectTraceMatchesPython(buildControlTrace(s), program);
    expect(py.stdout.trimEnd()).toBe(computeControl(s).output);
  });
});
