import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/docs/readmes-docstrings',
  title: 'READMEs, docstrings and doctests',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Write a README that answers what, why, how to install, how to use and how to contribute',
    'Write docstrings in the Google or NumPy style with arguments, returns, raises and examples',
    'Turn docstring examples into tests with doctest',
    'Document an ML model’s intended use and limits with a model card',
  ],
  prerequisites: ['git/foundations/why-version-control'],
  concepts: ['readme', 'docstring', 'doctest', 'model-card'],
  references: [
    { title: 'PEP 257: Docstring Conventions', url: 'https://peps.python.org/pep-0257/' },
    { title: 'Google Python Style Guide: Comments and Docstrings', url: 'https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings' },
    { title: 'numpydoc docstring guide', url: 'https://numpydoc.readthedocs.io/en/latest/format.html' },
    { title: 'doctest: Test interactive Python examples', url: 'https://docs.python.org/3/library/doctest.html', version: 'Python 3.13' },
    { title: 'Model Cards for Model Reporting (Mitchell et al., 2019)', url: 'https://arxiv.org/abs/1810.03993' },
  ],
} satisfies LessonMeta;
