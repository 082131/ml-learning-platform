import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/probability/probability-rules',
  title: 'Probability: counting what could happen',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain what a probability of 0.3 means as a long-run share of outcomes',
    'Compute probabilities by counting equally likely outcomes in a sample space',
    'Use the complement, "or" (addition) and "and" (multiplication) rules, and say when each applies',
    'Tell independent events from mutually exclusive ones, and test independence from counts',
  ],
  prerequisites: [],
  concepts: ['sample-space', 'probability-event', 'mutually-exclusive', 'independent-events', 'complement-rule'],
  references: [
    { title: 'Blitzstein and Hwang, Introduction to Probability (2nd ed.), chapter 1', url: 'https://projects.iq.harvard.edu/stat110/home' },
    { title: 'OpenIntro Statistics (4th ed.), section 3.1: Defining probability', url: 'https://www.openintro.org/book/os/' },
    { title: 'Python docs: fractions and itertools.product', url: 'https://docs.python.org/3.13/library/fractions.html', version: '3.13' },
  ],
} satisfies LessonMeta;
