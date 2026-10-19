import MiniSearch from 'minisearch';
import type { GlossaryTerm, LessonMeta } from '../types';

export interface SearchDoc {
  id: string;
  kind: 'lesson' | 'term';
  title: string;
  /** Lesson ID for lessons, glossary term ID for terms. */
  target: string;
  /** Short line shown under the title in results. */
  detail: string;
  body: string;
  tags: string;
}

export const MAX_RESULTS = 12;

export function buildDocs(
  lessons: { meta: LessonMeta; trackTitle: string }[],
  glossary: GlossaryTerm[],
): SearchDoc[] {
  const termName = new Map(glossary.map((g) => [g.id, g.term]));
  return [
    ...lessons.map(({ meta, trackTitle }) => ({
      id: `lesson:${meta.id}`,
      kind: 'lesson' as const,
      title: meta.title,
      target: meta.id,
      detail: trackTitle,
      body: meta.objectives.join(' '),
      tags: meta.concepts.map((c) => termName.get(c) ?? c).join(' '),
    })),
    ...glossary.map((g) => ({
      id: `term:${g.id}`,
      kind: 'term' as const,
      title: g.term,
      target: g.id,
      detail: g.short,
      body: `${g.short} ${g.long ?? ''}`,
      tags: (g.aliases ?? []).join(' '),
    })),
  ];
}

export type SearchIndex = MiniSearch<SearchDoc>;

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'body', 'tags'],
    storeFields: ['kind', 'title', 'target', 'detail'],
    searchOptions: { boost: { title: 3, tags: 2 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(docs);
  return index;
}

export type SearchHit = Pick<SearchDoc, 'id' | 'kind' | 'title' | 'target' | 'detail'>;

export function search(index: SearchIndex, query: string): SearchHit[] {
  if (!query.trim()) return [];
  return index
    .search(query)
    .slice(0, MAX_RESULTS)
    .map((r) => ({ id: r.id as string, kind: r.kind, title: r.title, target: r.target, detail: r.detail }));
}
