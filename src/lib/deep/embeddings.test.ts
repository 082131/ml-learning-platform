import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import {
  computeEmbeddings,
  describeCosine,
  EMBEDDING_SOURCE,
  embeddingExperiment,
  embeddingProgramOutput,
  embeddingSlots,
  moveToken,
  neighbours,
  oneHot,
  placeLabels,
  vecMat,
  type EmbeddingState,
  type Vec2,
} from './embeddings';

const TOKENS = ['cat', 'kitten', 'dog', 'puppy', 'car', 'truck', 'apple', 'banana'];
const E: Vec2[] = [
  [3, 1],
  [2, 1],
  [2.5, 2],
  [1.5, 1.5],
  [-1, 3.5],
  [-2, 4],
  [-3, -2],
  [-2.5, -3],
];
const INT_E: Vec2[] = [
  [3, 1],
  [2, 1],
  [2, 2],
  [1, 1],
  [-1, 3],
  [-2, 4],
  [-3, -2],
  [0, -3],
];
const state = (table: Vec2[], a: number, b: number): EmbeddingState => ({ tokens: TOKENS, E: table, a, b });

/** Printed by EMBEDDING_SOURCE's last five lines with NumPy 2.5.3 on CPython 3.13.16. */
const NUMPY_RUNS = [
  { E, a: 0, b: 1, output: '[3. 1.]\n[3. 1.]\n0.9899' },
  { E, a: 4, b: 6, output: '[-1.   3.5]\n[-1.   3.5]\n-0.3048' },
  { E: INT_E, a: 7, b: 3, output: '[ 0. -3.]\n[ 0 -3]\n-0.7071' },
  { E: INT_E, a: 2, b: 2, output: '[2. 2.]\n[2 2]\n1.0000' },
];

describe('embedding lookup', () => {
  it('one-hot times the table picks out one row', () => {
    expect(oneHot(2, 4)).toEqual([0, 0, 1, 0]);
    // [0, 1, 0] @ [[1, 2], [3, 4], [5, 6]] = (0·1 + 1·3 + 0·5, 0·2 + 1·4 + 0·6) = (3, 4)
    expect(
      vecMat(
        [0, 1, 0],
        [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      ),
    ).toEqual([3, 4]);
    expect(computeEmbeddings(state(E, 4, 0)).lookup).toEqual([-1, 3.5]);
  });
});

describe('cosine similarity of the toy table', () => {
  it('works the cat–kitten example by hand', () => {
    // (3·2 + 1·1) / (√10 · √5) = 7 / √50 ≈ 0.98995
    const r = computeEmbeddings(state(E, 0, 1));
    expect(r.dot).toBe(7);
    expect(r.cos).toBeCloseTo(7 / Math.sqrt(50), 12);
    expect(describeCosine(E[0]!, E[1]!)).toEqual({
      dot: '3·2 + 1·1 = 7',
      normA: '√(3² + 1²) = √10 = 3.1623',
      normB: '√(2² + 1²) = √5 = 2.2361',
      cos: '7 / (3.1623 × 2.2361) = 0.9899',
    });
  });

  it('ranks neighbours by cosine, ignoring length', () => {
    // puppy (1.5, 1.5) and dog (2.5, 2) differ in length; cos(cat, kitten) beats both.
    expect(neighbours(E, 0).map((n) => TOKENS[n.id])).toEqual([
      'kitten',
      'dog',
      'puppy',
      'car',
      'truck',
      'banana',
      'apple',
    ]);
  });

  it.each(NUMPY_RUNS)('prints what NumPy printed for a=$a, b=$b', ({ E: table, a, b, output }) => {
    const s = state(table, a, b);
    expect(embeddingProgramOutput(s, computeEmbeddings(s))).toBe(output);
  });
});

describe('moving tokens', () => {
  it('snaps to the half grid, clamps to the map and refuses the origin', () => {
    const s = state(E, 0, 1);
    expect(moveToken(s, 1, 2.26, -9).E[1]).toEqual([2.5, -5]);
    expect(moveToken(s, 1, 0.1, -0.2)).toBe(s);
    expect(s.E[1]).toEqual([2, 1]);
  });
});

describe('embeddingExperiment', () => {
  const def = embeddingExperiment('emb', state(E, 0, 1), 'emb-code');
  it('is valid, with a trace that fits the filled source', () => {
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(EMBEDDING_SOURCE, [], embeddingSlots(def.initial));
    expect(source.split('\n')[3]).toBe(
      'E = np.array([[3, 1], [2, 1], [2.5, 2], [1.5, 1.5], [-1, 3.5], [-2, 4], [-3, -2], [-2.5, -3]])',
    );
    const trace = def.trace!(def.initial);
    expect(validateTrace(trace, source)).toEqual([]);
    expect(trace.steps[4]!.note).toContain('(8,) @ (8, 2) → (2,)');
  });
  it('reads out the arithmetic and the nearest tokens', () => {
    const items = def.readout!(def.initial, def.compute(def.initial));
    expect(items.map((i) => i.value)).toEqual([
      '3·2 + 1·1 = 7',
      '3.1623 × 2.2361 = 7.0711',
      '7 / (3.1623 × 2.2361) = 0.9899',
      'kitten 0.9899, dog 0.9383, puppy 0.8944',
      '[3. 1.]\n[3. 1.]\n0.9899',
    ]);
  });
});

describe('placeLabels', () => {
  it('moves a label off a neighbouring point and off earlier labels', () => {
    // Point 0 at (100, 100) with a 40 px label; point 1 at (130, 90) sits in 0's north-east box.
    expect(
      placeLabels(
        [
          [100, 100],
          [130, 90],
        ],
        [40, 40],
      ),
    ).toEqual(['nw', 'ne']);
    // Far apart: both keep the default corner.
    expect(
      placeLabels(
        [
          [0, 0],
          [300, 300],
        ],
        [40, 40],
      ),
    ).toEqual(['ne', 'ne']);
  });
});
