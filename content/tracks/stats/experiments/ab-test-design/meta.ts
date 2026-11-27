import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/experiments/ab-test-design',
  title: 'Designing an A/B test: metric, randomization and sample size',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why randomization makes a difference between groups a measure of cause and effect',
    'Choose a primary metric, guardrail metrics and the randomization unit, and write them down before the test',
    'Compute visitors per group from the baseline rate, the minimum detectable effect, α and power, and turn it into a duration',
    'Assign users to groups with a deterministic hash, and know which design mistakes invalidate a test',
  ],
  prerequisites: ['stats/inference/errors-power'],
  concepts: ['ab-test', 'randomization-unit', 'minimum-detectable-effect', 'guardrail-metric', 'statistical-power'],
  references: [
    { title: 'Kohavi, Tang and Xu, Trustworthy Online Controlled Experiments (Cambridge, 2020)', url: 'https://experimentguide.com/' },
    { title: 'Evan Miller: Sample size calculator', url: 'https://www.evanmiller.org/ab-testing/sample-size.html' },
    { title: 'Python docs: hashlib', url: 'https://docs.python.org/3.13/library/hashlib.html', version: '3.13' },
  ],
} satisfies LessonMeta;
