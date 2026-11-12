import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/core/references-mutability',
  title: 'Names, objects and mutability',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Draw which objects a set of names refers to after a sequence of assignments',
    'Predict when changing one variable changes another (aliasing) and when it does not',
    'Choose between a shallow copy, a deep copy and building a new object',
    'Explain why mutability matters when you pass lists, dicts and arrays to functions',
  ],
  prerequisites: ['python/core/functions-scope', 'ml/foundations/python-collections'],
  concepts: ['aliasing', 'mutable-object', 'shallow-copy'],
  references: [
    {
      title: 'Python data model: objects, values and types',
      url: 'https://docs.python.org/3.13/reference/datamodel.html#objects-values-and-types',
      version: 'Python 3.13',
    },
    {
      title: 'copy: shallow and deep copy operations',
      url: 'https://docs.python.org/3.13/library/copy.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
