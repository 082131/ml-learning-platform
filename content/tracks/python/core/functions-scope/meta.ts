import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/core/functions-scope',
  title: 'Functions in depth: arguments, defaults and scope',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Call functions with positional, keyword, default, *args and **kwargs arguments and predict which value lands in which parameter',
    'Explain the LEGB scope rule and when a name inside a function refers to an outer variable',
    'Spot and fix the mutable default argument bug',
    'Write type hints and a docstring that make a data function self-explanatory',
  ],
  prerequisites: ['ml/foundations/python-control'],
  concepts: ['python-function', 'keyword-argument', 'variable-scope', 'type-hint'],
  references: [
    {
      title: 'Python tutorial: More on defining functions',
      url: 'https://docs.python.org/3.13/tutorial/controlflow.html#more-on-defining-functions',
      version: 'Python 3.13',
    },
    {
      title: 'Python execution model: naming and binding',
      url: 'https://docs.python.org/3.13/reference/executionmodel.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
