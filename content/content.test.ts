import { describe, expect, it } from 'vitest';
import { validateLessonData } from '@/lib/curriculum/lessonData';
import { validateContent } from '@/lib/curriculum/validate';
import { glossary, metaFiles, tracks } from './index';

const mdxPaths = Object.keys(import.meta.glob('./tracks/**/index.mdx')).map((p) =>
  p.replace(/^\./, '/content'),
);

describe('content validation', () => {
  it('curriculum, lesson metadata and glossary are consistent', () => {
    expect(validateContent({ tracks, metaFiles, mdxPaths, glossary })).toEqual([]);
  });

  it('code examples and quizzes are valid: annotation ranges match their source, answers are well formed', () => {
    const code = import.meta.glob<Record<string, unknown>>('./tracks/**/code.ts', { eager: true });
    const quiz = import.meta.glob<Record<string, unknown>>('./tracks/**/quiz.ts', { eager: true });
    expect(validateLessonData(code, quiz)).toEqual([]);
  });

  it('encodes every lesson from curriculum.md', () => {
    const count = (id: string) => tracks.find((t) => t.id === id)!.chapters.flatMap((c) => c.lessons).length;
    expect([
      count('ml'),
      count('data'),
      count('ai'),
      count('inference'),
      count('dataops'),
      count('deploy'),
      count('git'),
      count('automation'),
      count('rl'),
    ]).toEqual([55, 12, 13, 14, 9, 9, 14, 12, 13]);
  });
});
