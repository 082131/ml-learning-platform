import { describe, expect, it } from 'vitest';
import { hasPython, runPython } from './pythonOracle';
import { float, floatRepr, pyPrint, repr, strRepr, toTrace, typeName, type Py } from './pyValues';

const samples: Py[] = [
  3,
  -7,
  float(2.5),
  float(9),
  float(0.1 + 0.2),
  float(-0.5),
  'apples',
  "it's",
  'say "hi"',
  'a\\b',
  true,
  null,
  [1, 2, 3],
  [],
  ['a', float(1.5)],
  {
    dict: [
      ['apples', 3],
      ['pears', float(0.5)],
    ],
  },
];

describe('Python values', () => {
  it('writes repr() as Python does', () => {
    expect(floatRepr(9)).toBe('9.0');
    expect(floatRepr(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(strRepr("it's")).toBe('"it\'s"');
    expect(repr({ dict: [['a', 1]] })).toBe("{'a': 1}");
    expect(pyPrint('apples', 'cost', float(7.5))).toBe('apples cost 7.5');
    expect(typeName(float(1))).toBe('float');
  });
  it('shows floats as text so 9.0 is not mistaken for 9', () => {
    expect(toTrace(float(9))).toEqual({ kind: 'text', value: '9.0' });
    expect(toTrace(4)).toEqual({ kind: 'scalar', value: 4 });
    expect(toTrace([1, 2])).toEqual({ kind: 'array', shape: [2], data: [1, 2] });
  });
});

describe.skipIf(!hasPython)('Python values against CPython', () => {
  it('matches repr() and print() for every sample', () => {
    const literal = (v: Py): string => repr(v); // every sample's repr is also valid Python source
    const code = samples
      .map((v) => `print(repr(${literal(v)}))\nprint(${literal(v)})\nprint(type(${literal(v)}).__name__)`)
      .join('\n');
    const out = runPython(code).split('\n');
    samples.forEach((v, i) => {
      expect(out[3 * i]).toBe(repr(v));
      expect(out[3 * i + 1]).toBe(pyPrint(v));
      expect(out[3 * i + 2]).toBe(typeName(v));
    });
  });
});
