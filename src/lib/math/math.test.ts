import { describe, expect, it } from 'vitest';
import {
  addMatrices,
  column,
  filled,
  matmul,
  matmulShape,
  resize,
  ShapeError,
  shapeOf,
  transpose,
  withEntry,
} from './matrix';
import { allFinite, clamp, isFiniteOrDiverged, roundTo } from './numeric';
import { formatNumpyIntMatrix, pythonList } from './numpyFormat';
import { add, angleDegrees, cosine, dot, norm, scale, subtract } from './vector';

const A = [
  [1, 2, 3],
  [4, 5, 6],
];
const B = [
  [7, 8],
  [9, 10],
  [11, 12],
];

describe('vectors', () => {
  it('adds, subtracts and scales element by element', () => {
    expect(add([1, 2], [3, -1])).toEqual([4, 1]);
    expect(subtract([1, 2], [3, -1])).toEqual([-2, 3]);
    expect(scale([1, -2], 2.5)).toEqual([2.5, -5]);
  });

  it('computes the dot product, length, cosine and angle of hand-worked examples', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32); // 4 + 10 + 18
    expect(norm([3, 4])).toBe(5);
    expect(cosine([1, 0], [0, 2])).toBe(0);
    expect(angleDegrees([1, 0], [0, 2])).toBeCloseTo(90);
    expect(angleDegrees([1, 1], [2, 2])).toBeCloseTo(0);
    expect(angleDegrees([1, 0], [-3, 0])).toBeCloseTo(180);
    expect(cosine([0, 0], [1, 1])).toBeNaN();
  });

  it('rejects vectors of different lengths with a message naming both', () => {
    expect(() => dot([1, 2], [1, 2, 3])).toThrow(ShapeError);
    expect(() => add([1], [1, 2])).toThrow("Can't add vectors of length 1 and 2");
  });
});

describe('matrices', () => {
  it('reads shapes and rejects empty or ragged matrices', () => {
    expect(shapeOf(A)).toEqual([2, 3]);
    expect(() => shapeOf([])).toThrow(ShapeError);
    expect(() => shapeOf([[1, 2], [3]])).toThrow('Row 1 has 1 entries but row 0 has 2');
  });

  it('multiplies the hand-worked 2×3 by 3×2 example: [[58, 64], [139, 154]]', () => {
    // C[0][0] = 1·7 + 2·9 + 3·11 = 58, C[1][1] = 4·8 + 5·10 + 6·12 = 154
    expect(matmul(A, B)).toEqual([
      [58, 64],
      [139, 154],
    ]);
    expect(matmul(B, A)).toEqual([
      [39, 54, 69],
      [49, 68, 87],
      [59, 82, 105],
    ]);
    expect(matmul([[2]], [[3]])).toEqual([[6]]);
    expect(matmul([[1, 2]], [[3], [4]])).toEqual([[11]]); // row × column = dot product
  });

  it('refuses mismatched inner sizes and names both shapes', () => {
    expect(() => matmul(A, A)).toThrow("Can't multiply (2, 3) by (2, 3): A has 3 columns but B has 2 rows.");
    expect(matmulShape(A, B)).toEqual([2, 2]);
  });

  it('transposes, adds and reads columns', () => {
    expect(transpose(A)).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
    expect(transpose(transpose(A))).toEqual(A);
    expect(addMatrices(A, A)).toEqual([
      [2, 4, 6],
      [8, 10, 12],
    ]);
    expect(() => addMatrices(A, B)).toThrow("Can't add (2, 3) and (3, 2)");
    expect(column(B, 1)).toEqual([8, 10, 12]);
  });

  it('(AB)ᵀ = BᵀAᵀ on the worked example', () => {
    expect(transpose(matmul(A, B))).toEqual(matmul(transpose(B), transpose(A)));
  });

  it('resizes while keeping existing entries, and replaces single entries immutably', () => {
    expect(resize(A, 3, 2, () => 0)).toEqual([
      [1, 2],
      [4, 5],
      [0, 0],
    ]);
    expect(resize([[1]], 2, 2, (i, j) => i + j)).toEqual([
      [1, 1],
      [1, 2],
    ]);
    const changed = withEntry(A, 0, 1, 9);
    expect(changed).toEqual([
      [1, 9, 3],
      [4, 5, 6],
    ]);
    expect(A[0]).toEqual([1, 2, 3]);
    expect(filled(1, 2, 7)).toEqual([[7, 7]]);
  });
});

describe('numeric safety', () => {
  it('labels NaN, infinities and huge values as diverged', () => {
    expect(isFiniteOrDiverged(3.5)).toBe('finite');
    expect(isFiniteOrDiverged(NaN)).toBe('diverged');
    expect(isFiniteOrDiverged(-Infinity)).toBe('diverged');
    expect(isFiniteOrDiverged(2e6)).toBe('diverged');
    expect(isFiniteOrDiverged(50, 10)).toBe('diverged');
    expect(allFinite([1, 2, 3])).toBe(true);
    expect(allFinite([1, NaN])).toBe(false);
  });

  it('rounds and clamps', () => {
    expect(roundTo(0.1 + 0.2, 6)).toBe(0.3);
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
  });
});

describe('NumPy-style formatting', () => {
  // Expected strings are str(np.array(...)) from NumPy 2.5.3.
  it('matches NumPy’s print of integer matrices', () => {
    expect(
      formatNumpyIntMatrix([
        [58, 64],
        [139, 154],
      ]),
    ).toBe('[[ 58  64]\n [139 154]]');
    expect(
      formatNumpyIntMatrix([
        [1, -2],
        [30, 4],
      ]),
    ).toBe('[[ 1 -2]\n [30  4]]');
    expect(formatNumpyIntMatrix([[-100, 5, 0]])).toBe('[[-100    5    0]]');
    expect(formatNumpyIntMatrix([[7], [8]])).toBe('[[7]\n [8]]');
    expect(() => formatNumpyIntMatrix([[0.5]])).toThrow();
  });

  it('writes Python list literals', () => {
    expect(pythonList(A)).toBe('[[1, 2, 3], [4, 5, 6]]');
  });
});
