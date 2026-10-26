import { describe, expect, it } from 'vitest';
import { hasModule, runPython } from './pythonOracle';
import { A_SHAPES, B_SHAPES, aText, bText, computeBroadcast, tupleText } from './broadcasting';

describe('broadcasting C = A + B', () => {
  it('works through the hand-checked examples', () => {
    const ok = computeBroadcast({ a: '2,3', b: '3' });
    expect(ok).toMatchObject({ ok: true, shape: [2, 3], printed: '[[10 21 32]\n [13 24 35]]' });
    if (ok.ok)
      expect(ok.bCopy).toEqual([
        [false, false, false],
        [true, true, true],
      ]);
    expect(computeBroadcast({ a: '2,1', b: '1,3' })).toMatchObject({ ok: true, shape: [2, 3] });
    expect(computeBroadcast({ a: '2,3', b: '3,2' })).toMatchObject({
      ok: false,
      error: 'ValueError: operands could not be broadcast together with shapes (2,3) (3,2) ',
    });
    expect(aText('2,3')).toBe('np.array([[0, 1, 2], [3, 4, 5]])');
    expect(bText('')).toBe('10');
  });
});

describe.skipIf(!hasModule('numpy'))('broadcasting against NumPy', () => {
  it('gives the same shape, values or error for every pair of shapes the visualizer offers', () => {
    const pairs = A_SHAPES.flatMap((a) => B_SHAPES.map((b) => ({ a, b })));
    const program = `import numpy as np
def show(A, B):
    try:
        C = A + B
    except Exception as e:
        print(repr(type(e).__name__ + ": " + str(e)))
        return
    print(repr(str(C)), C.shape)
${pairs.map(({ a, b }) => `show(${aText(a)}, ${bText(b)})`).join('\n')}`;
    const out = runPython(program).trim().split('\n');
    expect(out).toHaveLength(pairs.length);
    pairs.forEach((p, k) => {
      const r = computeBroadcast(p);
      const q = (t: string) => `'${t.replace(/\n/g, '\\n')}'`;
      expect(r.ok ? `${q(r.printed)} ${tupleText(r.shape)}` : q(r.error), `${p.a} + ${p.b}`).toBe(out[k]);
    });
  });
});
