// Every code example in the Automation track passes the shared validator (annotation ranges inside the source, known
// languages, unique ids).
import { describe, expect, it } from 'vitest';
import { validateExample } from '@/lib/code/validate';
import type { CodeExample } from '@/lib/types';

const modules = import.meta.glob<Record<string, unknown>>('./*/*/code.ts', { eager: true });
const examples = Object.entries(modules).flatMap(([file, m]) =>
  Object.values(m)
    .filter((v): v is CodeExample => typeof v === 'object' && v !== null && 'language' in v && 'source' in v)
    .map((ex) => [file, ex] as const),
);

describe('Automation track code examples', () => {
  it('found examples', () => expect(examples.length).toBeGreaterThan(10));
  for (const [file, ex] of examples) it(`${file}: ${ex.id}`, () => expect(validateExample(ex)).toEqual([]));
  it('ids are unique', () => {
    const ids = examples.map(([, e]) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
