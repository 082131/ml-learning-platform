import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/functions-derivatives',
  title: 'Functions and derivatives as slope',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Read a function as a rule from input to output',
    'Explain a derivative as the slope of the tangent line',
    'Use the power, sum and constant-multiple rules for simple derivatives',
    'Estimate a derivative numerically and compare it with the exact one',
  ],
  prerequisites: [],
  concepts: ['function', 'derivative', 'tangent-line', 'finite-difference'],
  references: [
    {
      title: 'Python floating-point arithmetic: issues and limitations',
      url: 'https://docs.python.org/3/tutorial/floatingpoint.html',
      version: 'Python 3.13',
    },
    {
      title: 'Format specification mini-language',
      url: 'https://docs.python.org/3/library/string.html#format-specification-mini-language',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
