import { describe, expect, it } from 'vitest';
import { validateContent } from '@/lib/curriculum/validate';
import { glossary, metaFiles, tracks } from './index';

const mdxPaths = Object.keys(import.meta.glob('./tracks/**/index.mdx')).map((p) =>
  p.replace(/^\./, '/content'),
);

describe('content validation', () => {
  it('curriculum, lesson metadata and glossary are consistent', () => {
    expect(validateContent({ tracks, metaFiles, mdxPaths, glossary })).toEqual([]);
  });

  it('encodes every lesson from curriculum.md', () => {
    const count = (id: string) => tracks.find((t) => t.id === id)!.chapters.flatMap((c) => c.lessons).length;
    expect([count('ml'), count('data'), count('ai'), count('inference')]).toEqual([55, 12, 13, 14]);
  });
});
