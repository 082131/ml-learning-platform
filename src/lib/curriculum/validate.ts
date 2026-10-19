import type { GlossaryTerm, LessonMeta, Track } from '../types';

export interface ContentInput {
  tracks: Track[];
  /** meta.ts default exports keyed by file path (as import.meta.glob returns them). */
  metaFiles: Record<string, LessonMeta>;
  /** Paths of every index.mdx under content/tracks. */
  mdxPaths: string[];
  glossary: GlossaryTerm[];
}

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const KINDS = ['lesson', 'project', 'capstone'];

/** Lesson ID implied by a file path such as `/content/tracks/ml/math/tensors/meta.ts`. */
export function idFromPath(path: string): string | undefined {
  return /content\/tracks\/(.+)\/(?:meta\.ts|index\.mdx)$/.exec(path)?.[1];
}

/** Returns one cycle as a list of IDs (first repeated at the end), or undefined. */
export function findCycle(edges: Record<string, string[]>): string[] | undefined {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === 'done') return undefined;
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'visiting');
    stack.push(id);
    for (const next of edges[id] ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'done');
    return undefined;
  };
  for (const id of Object.keys(edges)) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

/** Checks the curriculum, lesson metadata and glossary against each other. Returns error messages. */
export function validateContent({ tracks, metaFiles, mdxPaths, glossary }: ContentInput): string[] {
  const errors: string[] = [];
  const metas: Record<string, LessonMeta> = {};
  for (const [path, meta] of Object.entries(metaFiles)) {
    const folderId = idFromPath(path);
    if (meta.id !== folderId) errors.push(`${path}: id "${meta.id}" does not match its folder "${folderId}"`);
    metas[meta.id] = meta;
  }
  const mdxIds = new Set(mdxPaths.map(idFromPath));
  const glossaryIds = new Set(glossary.map((g) => g.id));

  const refs = new Map<string, string>();
  const trackIds = new Set<string>();
  for (const track of tracks) {
    if (trackIds.has(track.id)) errors.push(`Duplicate track "${track.id}"`);
    trackIds.add(track.id);
    const chapterIds = new Set<string>();
    for (const chapter of track.chapters) {
      if (chapterIds.has(chapter.id)) errors.push(`Duplicate chapter "${track.id}/${chapter.id}"`);
      chapterIds.add(chapter.id);
      if (!LEVELS.includes(chapter.level)) errors.push(`Chapter "${chapter.id}" has invalid level`);
      for (const ref of chapter.lessons) {
        if (refs.has(ref.id)) errors.push(`Duplicate lesson "${ref.id}"`);
        refs.set(ref.id, ref.status);
        if (!ref.id.startsWith(`${track.id}/${chapter.id}/`))
          errors.push(`Lesson "${ref.id}" is not under ${track.id}/${chapter.id}/`);
        if (!metas[ref.id]) errors.push(`Lesson "${ref.id}" has no meta.ts`);
        if (ref.status === 'written' && !mdxIds.has(ref.id))
          errors.push(`Lesson "${ref.id}" is marked written but has no index.mdx`);
      }
      if (chapter.project) {
        const inChapter = chapter.lessons.some((l) => l.id === chapter.project);
        const kind = metas[chapter.project]?.kind;
        if (!inChapter || kind === 'lesson')
          errors.push(`Chapter "${chapter.id}" project "${chapter.project}" must be a project lesson in it`);
      }
    }
  }

  for (const [id, meta] of Object.entries(metas)) {
    if (!refs.has(id)) errors.push(`meta.ts for "${id}" is not listed in content/curriculum.ts`);
    if (!meta.title.trim()) errors.push(`"${id}" has an empty title`);
    if (!LEVELS.includes(meta.level)) errors.push(`"${id}" has invalid level "${meta.level}"`);
    if (!KINDS.includes(meta.kind)) errors.push(`"${id}" has invalid kind "${meta.kind}"`);
    if (!(meta.minutes > 0)) errors.push(`"${id}" needs a positive minutes estimate`);
    if (meta.objectives.length === 0) errors.push(`"${id}" has no objectives`);
    for (const p of meta.prerequisites) {
      if (p === id) errors.push(`"${id}" lists itself as a prerequisite`);
      else if (!refs.has(p)) errors.push(`"${id}" prerequisite "${p}" does not exist`);
    }
    for (const c of meta.concepts)
      if (!glossaryIds.has(c)) errors.push(`"${id}" concept "${c}" is not in content/glossary.ts`);
  }
  for (const id of mdxIds)
    if (id && !refs.has(id)) errors.push(`index.mdx for "${id}" is not listed in content/curriculum.ts`);

  const cycle = findCycle(Object.fromEntries(Object.entries(metas).map(([id, m]) => [id, m.prerequisites])));
  if (cycle) errors.push(`Prerequisite cycle: ${cycle.join(' → ')}`);

  const seenTerms = new Set<string>();
  for (const term of glossary) {
    if (seenTerms.has(term.id)) errors.push(`Duplicate glossary term "${term.id}"`);
    seenTerms.add(term.id);
    if (!refs.has(term.introducedIn))
      errors.push(`Glossary "${term.id}" introducedIn "${term.introducedIn}" does not exist`);
  }
  return errors;
}
