import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/core/iterators-comprehensions',
  title: 'Iterators, comprehensions and generators',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Rewrite a loop that builds a list, dict or set as a comprehension, with a condition',
    'Use enumerate, zip and sorted with a key function on records',
    'Explain how a generator produces values lazily and why it can be consumed only once',
    'Stream a large file line by line instead of loading it into memory',
  ],
  prerequisites: ['python/core/references-mutability'],
  concepts: ['iterator', 'comprehension', 'generator', 'lazy-evaluation'],
  references: [
    {
      title: 'Python tutorial: list comprehensions',
      url: 'https://docs.python.org/3.13/tutorial/datastructures.html#list-comprehensions',
      version: 'Python 3.13',
    },
    {
      title: 'Python glossary: generator and iterator',
      url: 'https://docs.python.org/3.13/glossary.html#term-generator',
      version: 'Python 3.13',
    },
    {
      title: 'itertools',
      url: 'https://docs.python.org/3.13/library/itertools.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
