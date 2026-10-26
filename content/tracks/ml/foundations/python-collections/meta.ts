import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/python-collections',
  title: 'Lists, dicts, indexing and slicing',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Create, read and change lists with indexes, including negative indexes',
    'Predict the result of any slice start:stop:step, including blank and negative parts',
    'Store and look up values by key in a dict, and loop over its items',
    'Explain why two names can share one list, and copy a list when you need a separate one',
  ],
  prerequisites: ['ml/foundations/python-control'],
  concepts: ['python-list', 'python-dict', 'slice', 'loop'],
  references: [
    {
      title: 'The Python tutorial: data structures (lists, dictionaries)',
      url: 'https://docs.python.org/3/tutorial/datastructures.html',
      version: 'Python 3.13',
    },
    {
      title: 'Sequence types: common operations, slicing (notes 3 to 5)',
      url: 'https://docs.python.org/3/library/stdtypes.html#common-sequence-operations',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
