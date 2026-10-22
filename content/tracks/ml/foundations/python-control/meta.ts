import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/python-control',
  title: 'Functions, conditions, loops',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Write a function with parameters and a return value, and call it',
    'Use if, elif and else with comparisons to choose what runs',
    'Repeat work with for over a list or range, and with while until a condition changes',
    'Follow a loop step by step and predict every variable along the way',
  ],
  prerequisites: ['ml/foundations/python-basics'],
  concepts: ['python-function', 'loop', 'variable'],
  references: [
    {
      title: 'The Python tutorial: more control flow tools (if, for, range, functions)',
      url: 'https://docs.python.org/3/tutorial/controlflow.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
