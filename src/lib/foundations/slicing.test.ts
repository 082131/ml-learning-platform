import { describe, expect, it } from 'vitest';
import { hasPython, runPython } from './pythonOracle';
import { computeSlice, sliceIndices, sliceSelection, sliceText, type Bound } from './slicing';

describe('Python slicing', () => {
  it('fills in blanks and clips out-of-range bounds', () => {
    expect(sliceIndices(8, 1, 6, 2)).toEqual([1, 6, 2]);
    expect(sliceSelection(8, 1, 6, 2)).toEqual([1, 3, 5]);
    expect(sliceSelection(8, null, null, -1)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(sliceSelection(8, -3, null, null)).toEqual([5, 6, 7]);
    expect(sliceIndices(8, -10, 10, null)).toEqual([0, 8, 1]);
    expect(sliceSelection(8, 6, 2, null)).toEqual([]);
    expect(() => sliceIndices(8, null, null, 0)).toThrow('slice step cannot be zero');
    expect(sliceText(null, 3, null)).toBe(':3');
    expect(computeSlice({ start: 1, stop: 6, step: 2 }).items).toEqual(['b', 'd', 'f']);
  });
});

describe.skipIf(!hasPython)('slicing against CPython', () => {
  it('matches slice.indices and the picked items for every bound and step the experiment offers', () => {
    const bounds: Bound[] = [null, -10, -9, -8, -7, -1, 0, 1, 4, 7, 8, 9, 10];
    const steps: Bound[] = [null, -3, -2, -1, 1, 2, 3];
    const cases = bounds.flatMap((a) => bounds.flatMap((b) => steps.map((c) => [a, b, c] as const)));
    const py = (v: Bound) => (v === null ? 'None' : String(v));
    const out = runPython(
      `xs = list(range(8))\n` +
        cases
          .map(
            ([a, b, c]) =>
              `print(slice(${py(a)}, ${py(b)}, ${py(c)}).indices(8), xs[${py(a)}:${py(b)}:${py(c)}])`,
          )
          .join('\n'),
    )
      .trim()
      .split('\n');
    cases.forEach(([a, b, c], i) => {
      const [x, y, z] = sliceIndices(8, a, b, c);
      expect(out[i], `[${a}:${b}:${c}]`).toBe(
        `(${x}, ${y}, ${z}) [${sliceSelection(8, a, b, c).join(', ')}]`,
      );
    });
  });
});
