import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/docs/docs-sites',
  title: 'API references, docs sites and the four kinds of documentation',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Sort documentation into tutorials, how-to guides, reference and explanation (Diataxis), and spot pages that mix them',
    'Generate an API reference from docstrings with Sphinx autodoc or mkdocstrings',
    'Build and publish a docs site from the repository, with docs reviewed in the same pull request as code',
    'Record design decisions with architecture decision records',
  ],
  prerequisites: ['git/docs/readmes-docstrings'],
  concepts: ['diataxis', 'api-reference', 'docs-as-code', 'static-site-generator', 'adr'],
  references: [
    { title: 'Diataxis: a systematic approach to technical documentation', url: 'https://diataxis.fr/' },
    { title: 'Sphinx: autodoc extension', url: 'https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html' },
    { title: 'MkDocs and mkdocstrings', url: 'https://mkdocstrings.github.io/' },
    { title: 'Write the Docs: Docs as Code', url: 'https://www.writethedocs.org/guide/docs-as-code/' },
    { title: 'Documenting Architecture Decisions (Michael Nygard)', url: 'https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions' },
  ],
} satisfies LessonMeta;
