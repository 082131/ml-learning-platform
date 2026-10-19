import type { GlossaryTerm, LessonMeta } from '@/lib/types';
import { tracks } from './curriculum';
import { glossary as sharedGlossary } from './glossary';

/** Every lesson's meta.ts, keyed by file path. Eager: titles and objectives are needed on every page. */
export const metaFiles = Object.fromEntries(
  Object.entries(import.meta.glob<LessonMeta>('./tracks/**/meta.ts', { eager: true, import: 'default' })).map(
    ([path, meta]) => [path.replace(/^\./, '/content'), meta],
  ),
);

export const metas: Record<string, LessonMeta> = Object.fromEntries(
  Object.values(metaFiles).map((m) => [m.id, m]),
);

/**
 * Glossary terms: the shared file plus one `glossary.ts` per chapter folder (default export: an
 * array). Chapter files let parallel content threads add terms without editing a shared file.
 */
const chapterGlossaries = import.meta.glob<GlossaryTerm[]>('./tracks/*/*/glossary.ts', {
  eager: true,
  import: 'default',
});
export const glossary: GlossaryTerm[] = [...sharedGlossary, ...Object.values(chapterGlossaries).flat()];

export { tracks };
