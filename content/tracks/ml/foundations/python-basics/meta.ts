import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/python-basics',
  title: 'Python: values, variables, types, printing',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Create variables and predict their value after each line runs',
    'Tell int, float and str apart and predict the type of a result',
    'Print values, and build text from numbers with str() and f-strings',
    'Read the TypeError and NameError messages beginners hit most',
  ],
  prerequisites: [],
  concepts: ['variable', 'data-type', 'string'],
  references: [
    {
      title: 'The Python tutorial: an informal introduction (numbers, text)',
      url: 'https://docs.python.org/3/tutorial/introduction.html',
      version: 'Python 3.13',
    },
    {
      title: 'Built-in types: numeric types int, float',
      url: 'https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex',
      version: 'Python 3.13',
    },
    {
      title: 'Floating-point arithmetic: issues and limitations',
      url: 'https://docs.python.org/3/tutorial/floatingpoint.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
