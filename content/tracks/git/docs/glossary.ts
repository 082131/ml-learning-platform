import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the git/docs chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'readme',
    term: 'README',
    short: 'The front page of a repository: what the project does, why, how to install and use it, and how to contribute.',
    introducedIn: 'git/docs/readmes-docstrings',
    aliases: ['README.md'],
  },
  {
    id: 'docstring',
    term: 'Docstring',
    short: 'A string literal as the first statement of a Python module, class or function. It becomes the object’s __doc__ and what help() shows.',
    introducedIn: 'git/docs/readmes-docstrings',
    aliases: ['__doc__'],
  },
  {
    id: 'doctest',
    term: 'doctest',
    short: 'A standard-library module that finds >>> examples in docstrings, runs them and checks the printed output, so examples stay correct.',
    introducedIn: 'git/docs/readmes-docstrings',
  },
  {
    id: 'model-card',
    term: 'Model card',
    short: 'A short document shipped with a model: intended use, training data, evaluation results across groups, limitations and ethical considerations.',
    introducedIn: 'git/docs/readmes-docstrings',
  },
  {
    id: 'diataxis',
    term: 'Diataxis',
    short: 'A documentation framework with four kinds of page, each for one need: tutorials (learning), how-to guides (tasks), reference (facts) and explanation (understanding).',
    introducedIn: 'git/docs/docs-sites',
    aliases: ['Diátaxis', 'four kinds of documentation'],
  },
  {
    id: 'api-reference',
    term: 'API reference',
    short: 'Documentation of every public module, class and function: signatures, parameters, return values and errors, usually generated from docstrings.',
    introducedIn: 'git/docs/docs-sites',
    aliases: ['reference docs'],
  },
  {
    id: 'docs-as-code',
    term: 'Docs as code',
    short: 'Writing documentation in plain-text files in the repository, reviewed in pull requests, tested and published by CI like code.',
    introducedIn: 'git/docs/docs-sites',
  },
  {
    id: 'static-site-generator',
    term: 'Static site generator',
    short: 'A tool that turns Markdown or reStructuredText files into a website of plain HTML files, such as MkDocs, Sphinx or Docusaurus.',
    introducedIn: 'git/docs/docs-sites',
    aliases: ['SSG', 'docs site'],
  },
  {
    id: 'adr',
    term: 'Architecture decision record',
    short: 'A short, numbered document recording one significant decision: its context, the decision, and its consequences.',
    introducedIn: 'git/docs/docs-sites',
    aliases: ['ADR'],
  },
] satisfies GlossaryTerm[];
