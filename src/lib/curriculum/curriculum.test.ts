import { describe, expect, it } from 'vitest';
import type { GlossaryTerm, LessonMeta, Track } from '../types';
import { createCurriculum, lessonPath } from './index';
import { findCycle, idFromPath, validateContent, type ContentInput } from './validate';

const meta = (id: string, extra: Partial<LessonMeta> = {}): LessonMeta => ({
  id,
  title: id,
  level: 'beginner',
  minutes: 30,
  objectives: ['Do a thing'],
  prerequisites: [],
  concepts: [],
  kind: 'lesson',
  ...extra,
});

const track = (lessons: { id: string; status: 'written' | 'outline' }[], project?: string): Track => ({
  id: 'ml',
  title: 'ML',
  code: 'T.01',
  summary: 's',
  chapters: [{ id: 'c', title: 'C', level: 'beginner', lessons, project }],
});

const file = (id: string) => `/content/tracks/${id}/meta.ts`;

function input(overrides: Partial<ContentInput> = {}): ContentInput {
  return {
    tracks: [
      track([
        { id: 'ml/c/a', status: 'written' },
        { id: 'ml/c/b', status: 'outline' },
      ]),
    ],
    metaFiles: {
      [file('ml/c/a')]: meta('ml/c/a', { concepts: ['t'] }),
      [file('ml/c/b')]: meta('ml/c/b', { prerequisites: ['ml/c/a'] }),
    },
    mdxPaths: ['/content/tracks/ml/c/a/index.mdx'],
    glossary: [{ id: 't', term: 'T', short: 'x', introducedIn: 'ml/c/a' } satisfies GlossaryTerm],
    ...overrides,
  };
}

describe('idFromPath', () => {
  it('extracts the lesson ID from meta and mdx paths', () => {
    expect(idFromPath('/content/tracks/ml/math/tensors/meta.ts')).toBe('ml/math/tensors');
    expect(idFromPath('./content/tracks/ai/rag/x/index.mdx')).toBe('ai/rag/x');
    expect(idFromPath('/elsewhere/meta.ts')).toBeUndefined();
  });
});

describe('findCycle', () => {
  it('finds a cycle and returns its path', () => {
    expect(findCycle({ a: ['b'], b: ['c'], c: ['a'] })).toEqual(['a', 'b', 'c', 'a']);
  });
  it('returns undefined for a DAG with shared prerequisites', () => {
    expect(findCycle({ a: [], b: ['a'], c: ['a', 'b'], d: ['c', 'a'] })).toBeUndefined();
  });
});

describe('validateContent', () => {
  it('passes consistent content', () => {
    expect(validateContent(input())).toEqual([]);
  });
  it('catches a folder that does not match the id', () => {
    const v = input();
    v.metaFiles = { ...v.metaFiles, [file('ml/c/b')]: meta('ml/c/wrong') };
    expect(validateContent(v).join('\n')).toMatch(/does not match its folder/);
  });
  it('catches a missing prerequisite, a self-reference and a cycle', () => {
    const missing = input();
    missing.metaFiles[file('ml/c/b')] = meta('ml/c/b', { prerequisites: ['ml/c/zzz'] });
    expect(validateContent(missing).join('\n')).toMatch(/prerequisite "ml\/c\/zzz" does not exist/);

    const self = input();
    self.metaFiles[file('ml/c/b')] = meta('ml/c/b', { prerequisites: ['ml/c/b'] });
    expect(validateContent(self).join('\n')).toMatch(/lists itself/);

    const cycle = input();
    cycle.metaFiles[file('ml/c/a')] = meta('ml/c/a', { prerequisites: ['ml/c/b'], concepts: ['t'] });
    expect(validateContent(cycle).join('\n')).toMatch(/Prerequisite cycle: ml\/c\/a → ml\/c\/b → ml\/c\/a/);
  });
  it('catches written lessons without MDX, and MDX or meta not in the curriculum', () => {
    expect(validateContent(input({ mdxPaths: [] })).join('\n')).toMatch(
      /marked written but has no index.mdx/,
    );
    expect(
      validateContent(
        input({ mdxPaths: ['/content/tracks/ml/c/a/index.mdx', '/content/tracks/ml/c/z/index.mdx'] }),
      ).join('\n'),
    ).toMatch(/index.mdx for "ml\/c\/z" is not listed/);
    const orphan = input();
    orphan.metaFiles[file('ml/c/z')] = meta('ml/c/z');
    expect(validateContent(orphan).join('\n')).toMatch(/meta.ts for "ml\/c\/z" is not listed/);
  });
  it('catches lessons without meta, outside their chapter, or duplicated', () => {
    const errors = validateContent(
      input({
        tracks: [
          track([
            { id: 'ml/c/a', status: 'written' },
            { id: 'ml/c/b', status: 'outline' },
            { id: 'ml/c/b', status: 'outline' },
            { id: 'ml/other/x', status: 'outline' },
          ]),
        ],
      }),
    ).join('\n');
    expect(errors).toMatch(/Duplicate lesson "ml\/c\/b"/);
    expect(errors).toMatch(/"ml\/other\/x" is not under ml\/c\//);
    expect(errors).toMatch(/"ml\/other\/x" has no meta.ts/);
  });
  it('catches bad metadata fields', () => {
    const v = input();
    v.metaFiles[file('ml/c/b')] = meta('ml/c/b', {
      title: ' ',
      objectives: [],
      minutes: 0,
      concepts: ['nope'],
    });
    const errors = validateContent(v).join('\n');
    expect(errors).toMatch(/empty title/);
    expect(errors).toMatch(/no objectives/);
    expect(errors).toMatch(/positive minutes/);
    expect(errors).toMatch(/concept "nope" is not in/);
  });
  it('checks chapter projects and glossary links', () => {
    const v = input({
      tracks: [
        track(
          [
            { id: 'ml/c/a', status: 'written' },
            { id: 'ml/c/b', status: 'outline' },
          ],
          'ml/c/b',
        ),
      ],
    });
    expect(validateContent(v).join('\n')).toMatch(/must be a project lesson/);
    const g = input({
      glossary: [
        { id: 't', term: 'T', short: 'x', introducedIn: 'ml/c/a' },
        { id: 't', term: 'T', short: 'x', introducedIn: 'ml/c/none' },
      ],
    });
    const errors = validateContent(g).join('\n');
    expect(errors).toMatch(/Duplicate glossary term "t"/);
    expect(errors).toMatch(/introducedIn "ml\/c\/none" does not exist/);
  });
});

describe('createCurriculum', () => {
  const t = track([
    { id: 'ml/c/a', status: 'written' },
    { id: 'ml/c/b', status: 'outline' },
    { id: 'ml/c/c', status: 'outline' },
  ]);
  const c = createCurriculum([t], {
    'ml/c/a': meta('ml/c/a'),
    'ml/c/b': meta('ml/c/b'),
    'ml/c/c': meta('ml/c/c'),
  });

  it('looks up lessons with their track position', () => {
    expect(c.getLesson('ml/c/b')?.number).toBe(2);
    expect(c.getLesson('nope')).toBeUndefined();
    expect(c.getTrack('ml')?.code).toBe('T.01');
    expect(c.lessonsOf('ml').map((l) => l.ref.id)).toEqual(['ml/c/a', 'ml/c/b', 'ml/c/c']);
    expect(c.statusById).toEqual({ 'ml/c/a': 'written', 'ml/c/b': 'outline', 'ml/c/c': 'outline' });
  });
  it('gives previous and next within the track', () => {
    expect(c.neighbors('ml/c/a').prev).toBeUndefined();
    expect(c.neighbors('ml/c/b').prev?.ref.id).toBe('ml/c/a');
    expect(c.neighbors('ml/c/b').next?.ref.id).toBe('ml/c/c');
    expect(c.neighbors('ml/c/c').next).toBeUndefined();
    expect(c.neighbors('nope')).toEqual({});
  });
  it('throws when a lesson has no meta', () => {
    expect(() => createCurriculum([t], {})).toThrow(/has no meta.ts/);
  });
  it('builds lesson paths', () => {
    expect(lessonPath('ml/c/a')).toBe('/learn/ml/c/a');
  });
});
