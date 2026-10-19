import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MDXComponents } from 'mdx/types';
import { glossary, metas, tracks } from '@content/index';
import { createCurriculum } from '@/lib/curriculum';

export const curriculum = createCurriculum(tracks, metas);
export const glossaryById = new Map(glossary.map((g) => [g.id, g]));
export { glossary };

type LessonModule = { default: ComponentType<{ components?: MDXComponents }> };

// Lazy: each lesson's MDX is its own chunk, loaded when the lesson opens.
const loaders = import.meta.glob<LessonModule>('/content/tracks/**/index.mdx');

const PATH = /^\/content\/tracks\/(.+)\/index\.mdx$/;

/** Written lessons' MDX content by lesson ID. Each is code-split and fetched on first render. */
export const lessonContent: Record<string, LazyExoticComponent<LessonModule['default']>> = Object.fromEntries(
  Object.entries(loaders).map(([path, load]) => [PATH.exec(path)?.[1], lazy(load)]),
);
