import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { querySlot, similarityExperiment, type SimilarityItem } from './similarityExperiment';
import { cosine } from '../math/vector';
import sentences from './data/sentence-embeddings.json';
import { rankByCosine, readTable } from './embeddings';
import { decodeFloat16Rows, halfToNumber } from './float16';
import { pca2d } from './pca';

describe('float16', () => {
  it('decodes hand-worked half-precision bit patterns', () => {
    expect(halfToNumber(0x3c00)).toBe(1); // exponent 15 → 2^0
    expect(halfToNumber(0xc000)).toBe(-2);
    expect(halfToNumber(0x3555)).toBeCloseTo(0.333251953125, 12); // 2^-2 · (1 + 341/1024)
    expect(halfToNumber(0x0001)).toBe(2 ** -24); // smallest subnormal
    expect(halfToNumber(0x7c00)).toBe(Infinity);
  });

  it('splits base64 data into rows', () => {
    // Little-endian bytes of 1, -2, 0.5, 0 → 00 3c | 00 c0 | 00 38 | 00 00
    const b64 = btoa(String.fromCharCode(0x00, 0x3c, 0x00, 0xc0, 0x00, 0x38, 0x00, 0x00));
    expect(decodeFloat16Rows(b64, 2)).toEqual([
      [1, -2],
      [0.5, 0],
    ]);
    expect(() => decodeFloat16Rows(b64, 3)).toThrow("can't be split into 3 rows");
  });
});

describe('the bundled sentence embeddings', () => {
  const table = readTable(sentences.items, sentences.vectors);
  const byId = (id: string) => table.find((t) => t.id === id)!;

  it('has one 384-dimension, unit-length vector per text', () => {
    expect(table).toHaveLength(sentences.items.length);
    for (const t of table) {
      expect(t.vector).toHaveLength(384);
      expect(Math.hypot(...t.vector)).toBeCloseTo(1, 2);
    }
  });

  // The values the lesson quotes, computed with numpy from the same float16 table.
  it.each([
    ['movie-good', 'movie-not-good', 0.8],
    ['cat-mat', 'kitten-rug', 0.574],
    ['paycheck-bank', 'river-picnic', 0.37],
    ['paycheck-bank', 'savings-account', 0.286],
  ])('cos(%s, %s) ≈ %f', (a, b, expected) => {
    expect(cosine(byId(a).vector, byId(b).vector)).toBeCloseTo(expected, 3);
  });

  it('ranks the sentences for a query, best first', () => {
    const query = byId('q-kitten');
    const ranked = rankByCosine(query.vector, table.filter((t) => t.id !== 'q-kitten' && !t.id.startsWith('q-')));
    expect(ranked.slice(0, 2).map((r) => r.item.id)).toEqual(['cat-mat', 'kitten-rug']);
    expect(ranked[0]!.score).toBeCloseTo(0.627, 3);
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
  });
});

describe('pca2d', () => {
  it('puts points that lie on a line along the first axis', () => {
    const p = pca2d([
      [0, 0, 0],
      [1, 1, 0],
      [2, 2, 0],
    ]);
    // Centered: (−1,−1,0), (0,0,0), (1,1,0). The first axis is (1,1,0)/√2, so coordinates are −√2, 0, √2.
    expect(p.points.map(([x]) => x)).toEqual([
      expect.closeTo(-Math.SQRT2, 6),
      expect.closeTo(0, 6),
      expect.closeTo(Math.SQRT2, 6),
    ]);
    expect(p.points.every(([, y]) => Math.abs(y) < 1e-9)).toBe(true);
    expect(p.explained[0]).toBeCloseTo(1, 6);
  });

  it('keeps the two directions of largest spread', () => {
    const p = pca2d([
      [3, 0, 0.1],
      [-3, 0, -0.1],
      [0, 1, 0],
      [0, -1, 0],
    ]);
    expect(Math.abs(p.points[0]![0])).toBeCloseTo(Math.hypot(3, 0.1), 4);
    expect(Math.abs(p.points[2]![1])).toBeCloseTo(1, 4);
    expect(p.explained[0] + p.explained[1]).toBeCloseTo(1, 6);
  });
});

describe('similarityExperiment', () => {
  const items = readTable(sentences.items, sentences.vectors) as SimilarityItem[];
  const def = similarityExperiment('sim', items, 'q-kitten');

  it('is valid and ranks every sentence for the chosen query', () => {
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute(def.initial);
    expect(r.ranked).toHaveLength(20);
    expect(r.map.points).toHaveLength(items.length);
    expect(def.readout!(def.initial, r)[0]).toEqual({ label: '#1 · cosine 0.627', value: 'A cat was sitting on the mat.' });
  });

  it('ranks a sentence first against itself, with cosine 1', () => {
    const r = def.compute({ query: 'movie-good' });
    expect(r.ranked[0]!.item.id).toBe('movie-good');
    expect(r.ranked[0]!.score).toBeCloseTo(1, 3);
    expect(r.ranked[1]!.item.id).toBe('movie-not-good');
  });

  it('fills the code slot with the query as a Python string', () => {
    expect(querySlot({ query: 'q-savings' }, items)).toBe("'Where should I keep the money I am saving?'");
  });
});
