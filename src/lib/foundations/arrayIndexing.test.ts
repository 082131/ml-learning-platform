import { describe, expect, it } from 'vitest';
import { hasModule, runPython } from './pythonOracle';
import {
  KINDS,
  SHAPES,
  arrayStr,
  arrayText,
  computeIndex,
  indexText,
  tupleText,
  type IndexState,
} from './arrayIndexing';

describe('NumPy indexing of np.arange(12)', () => {
  it('works through the hand-checked examples', () => {
    const at = (s: Partial<IndexState>) => computeIndex({ shape: '3,4', kind: 'element', i: 1, j: 2, ...s });
    expect(at({})).toMatchObject({ ok: true, printed: '6', outShape: [] });
    expect(at({ kind: 'column' })).toMatchObject({ printed: '[ 2  6 10]', outShape: [3] });
    expect(at({ kind: 'corner' })).toMatchObject({ printed: '[[ 6  7]\n [10 11]]', outShape: [2, 2] });
    expect(at({ i: 3 })).toMatchObject({
      ok: false,
      error: 'IndexError: index 3 is out of bounds for axis 0 with size 3',
    });
    expect(arrayStr([])).toBe('[]');
    expect(tupleText([12])).toBe('(12,)');
  });
});

describe.skipIf(!hasModule('numpy'))('indexing against NumPy', () => {
  it('prints the same result, shape or error for every shape, index and i, j the explorer offers', () => {
    const states: IndexState[] = SHAPES.flatMap((shape) =>
      KINDS.flatMap((kind) =>
        [-13, -12, -7, -4, -3, -1, 0, 1, 2, 3, 4, 5, 6, 11].flatMap((i) =>
          [-5, -4, -1, 0, 2, 3, 4, 11].map((j) => ({ shape, kind, i, j })),
        ),
      ),
    );
    const program = `import numpy as np
def show(make, index):
    a = make()
    try:
        part = eval(index)
    except Exception as e:
        print(type(e).__name__ + ": " + str(e))
        return
    print(repr(str(part)), np.shape(part))
${states.map((s) => `show(lambda: ${arrayText(s.shape)}, ${JSON.stringify(indexText(s.kind, s.i, s.j))})`).join('\n')}`;
    const out = runPython(program).trim().split('\n');
    expect(out).toHaveLength(states.length);
    states.forEach((s, k) => {
      const r = computeIndex(s);
      const mine = r.ok
        ? `${JSON.stringify(r.printed).replace(/^"|"$/g, "'")} ${tupleText(r.outShape)}`
        : r.error;
      expect(mine, `${arrayText(s.shape)} then ${indexText(s.kind, s.i, s.j)}`).toBe(out[k]);
    });
  });
});
