import { describe, expect, it } from 'vitest';
import { npRound, pyFixed, pyFloatList, pyRepr, rint } from './pyFormat';

// Expected strings were printed by CPython 3.13.x with NumPy 2.5.3.
describe('Python number formatting', () => {
  it('pyRepr matches repr(float)', () => {
    const vals = [0.1, 1.0, -2.5, 0.1 + 0.2, 1e-5, 0.0001, 123.456, 1e16, 1.5e16, -0, 0.2689414213699951];
    expect(vals.map(pyRepr)).toEqual([
      '0.1',
      '1.0',
      '-2.5',
      '0.30000000000000004',
      '1e-05',
      '0.0001',
      '123.456',
      '1e+16',
      '1.5e+16',
      '-0.0',
      '0.2689414213699951',
    ]);
    expect(pyRepr(12345678901234567)).toBe('1.2345678901234568e+16');
    expect(pyRepr(2.5e-7)).toBe('2.5e-07');
  });

  it('pyFixed matches f"{x:.df}", including ties to even', () => {
    const cases: [number, number, string][] = [
      [0.03125, 4, '0.0312'],
      [0.0625, 3, '0.062'],
      [-0.03125, 4, '-0.0312'],
      [2.5, 0, '2'],
      [3.5, 0, '4'],
      [0.268941, 4, '0.2689'],
      [-1, 4, '-1.0000'],
      [-0.00001, 4, '-0.0000'],
      [0.12345, 4, '0.1235'],
    ];
    for (const [x, d, out] of cases) expect(pyFixed(x, d)).toBe(out);
  });

  it('npRound matches ndarray.round (multiply, round half to even, divide)', () => {
    expect([0.12345, 0.99995, -0.00004, 0.55146701301, 2.5e-5, 1.23455].map((x) => npRound(x, 4))).toEqual([
      0.1234, 1, -0, 0.5515, 0, 1.2346,
    ]);
    expect([0.5, 1.5, 2.5, -0.5, -1.5, -2.5].map(rint)).toEqual([0, 2, 2, -0, -2, -2]);
  });

  it('pyFloatList prints like list.__repr__', () => {
    expect(
      pyFloatList([
        [0.5, -1],
        [2, 0.1],
      ]),
    ).toBe('[[0.5, -1.0], [2.0, 0.1]]');
  });
});
