import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/inference/errors-power',
  title: 'Type I and II errors, power and sample size',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Name the two ways a test can be wrong (false alarm, missed effect) and the rates α and β that measure them',
    'Explain statistical power as the chance of detecting an effect that is really there, and see it as an area under a shifted curve',
    'Predict how effect size, sample size and α change power, and compute the n needed for 80% power',
    'Explain why underpowered studies both miss real effects and exaggerate the ones they do find',
  ],
  prerequisites: ['stats/inference/hypothesis-tests'],
  concepts: ['type-i-error', 'type-ii-error', 'statistical-power', 'effect-size', 'significance-level'],
  references: [
    { title: 'Cohen (1992), A power primer', url: 'https://doi.org/10.1037/0033-2909.112.1.155' },
    { title: 'Gelman and Carlin (2014), Beyond power calculations: Type S and Type M errors', url: 'https://doi.org/10.1177/1745691614551642' },
    { title: 'NIST/SEMATECH e-Handbook: 7.2.2.2 Sample sizes required', url: 'https://www.itl.nist.gov/div898/handbook/prc/section2/prc222.htm' },
  ],
} satisfies LessonMeta;
