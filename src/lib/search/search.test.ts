import { describe, expect, it } from 'vitest';
import type { GlossaryTerm, LessonMeta } from '../types';
import { buildDocs, buildIndex, MAX_RESULTS, search } from './index';

const lesson = (id: string, title: string, objectives: string[], concepts: string[] = []): LessonMeta => ({
  id,
  title,
  level: 'beginner',
  minutes: 30,
  objectives,
  prerequisites: [],
  concepts,
  kind: 'lesson',
});
const glossary: GlossaryTerm[] = [
  {
    id: 'gradient',
    term: 'Gradient',
    short: 'Vector of partial derivatives.',
    introducedIn: 'ml/math/g',
    aliases: ['slope vector'],
  },
];
const index = buildIndex(
  buildDocs(
    [
      {
        meta: lesson('ml/math/g', 'Gradients and the chain rule', ['Compute partial derivatives']),
        trackTitle: 'ML',
      },
      {
        meta: lesson('ml/math/loss', 'Loss functions', ['Run gradient descent by hand'], ['gradient']),
        trackTitle: 'ML',
      },
      { meta: lesson('data/x/y', 'Joins and indexes', ['Predict join rows']), trackTitle: 'Data' },
    ],
    glossary,
  ),
);

describe('search', () => {
  it('finds lessons by title, objectives and concept tags, and glossary terms', () => {
    const hits = search(index, 'gradient');
    expect(hits.map((h) => h.id)).toEqual(
      expect.arrayContaining(['lesson:ml/math/g', 'lesson:ml/math/loss', 'term:gradient']),
    );
    expect(hits.find((h) => h.kind === 'term')).toMatchObject({
      target: 'gradient',
      detail: 'Vector of partial derivatives.',
    });
  });
  it('matches prefixes, typos and aliases', () => {
    expect(search(index, 'joi')[0]?.target).toBe('data/x/y');
    expect(search(index, 'gradeint').length).toBeGreaterThan(0);
    expect(search(index, 'slope')[0]?.target).toBe('gradient');
  });
  it('returns nothing for empty queries and caps results', () => {
    expect(search(index, '   ')).toEqual([]);
    expect(search(index, 'zzzzqqq')).toEqual([]);
    expect(search(index, 'e').length).toBeLessThanOrEqual(MAX_RESULTS);
  });
});
