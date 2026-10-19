import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ml/classical chapter (merged into the glossary by content/index.ts).
// Each lesson keeps its terms in glossary/<lesson>.ts (default export: an array), so lessons can be
// written in parallel without editing one file. `introducedIn` is the lesson that first teaches the term.
const files = import.meta.glob<GlossaryTerm[]>('./glossary/*.ts', { eager: true, import: 'default' });

export default Object.keys(files)
  .sort()
  .flatMap((path) => files[path]!) satisfies GlossaryTerm[];
