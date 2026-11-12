import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/core/classes-dataclasses',
  title: 'Classes, dataclasses and the data model',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write a class with __init__, methods and attributes, and explain what self is',
    'Implement __len__ and __getitem__ so an object works with len(), indexing and for loops',
    'Replace boilerplate with a dataclass, including defaults and frozen instances',
    'Recognize the same protocol in torch.utils.data.Dataset',
  ],
  prerequisites: ['python/core/iterators-comprehensions'],
  concepts: ['python-class', 'dunder-method', 'dataclass'],
  references: [
    {
      title: 'Python tutorial: classes',
      url: 'https://docs.python.org/3.13/tutorial/classes.html',
      version: 'Python 3.13',
    },
    {
      title: 'dataclasses',
      url: 'https://docs.python.org/3.13/library/dataclasses.html',
      version: 'Python 3.13',
    },
    {
      title: 'Python data model: emulating container types',
      url: 'https://docs.python.org/3.13/reference/datamodel.html#emulating-container-types',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
