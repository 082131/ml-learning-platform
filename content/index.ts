import type { LessonMeta } from '@/lib/types';
import { tracks } from './curriculum';
import { glossary } from './glossary';

/** Every lesson's meta.ts, keyed by file path. Eager: titles and objectives are needed on every page. */
export const metaFiles = Object.fromEntries(
  Object.entries(import.meta.glob<LessonMeta>('./tracks/**/meta.ts', { eager: true, import: 'default' })).map(
    ([path, meta]) => [path.replace(/^\./, '/content'), meta],
  ),
);

export const metas: Record<string, LessonMeta> = Object.fromEntries(
  Object.values(metaFiles).map((m) => [m.id, m]),
);

export { glossary, tracks };
