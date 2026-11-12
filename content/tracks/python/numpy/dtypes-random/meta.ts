import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/numpy/dtypes-random',
  title: 'dtypes, precision and reproducible randomness',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Predict overflow and rounding for int8, int64, float32 and float64',
    'Compare floats safely with a tolerance and handle NaN',
    'Generate reproducible random numbers with np.random.default_rng and a seed',
    'Explain why ML code uses float32 by default',
  ],
  prerequisites: ['python/numpy/indexing-views'],
  concepts: ['dtype', 'floating-point', 'integer-overflow', 'nan', 'random-seed'],
  references: [
    {
      title: 'NumPy: data types',
      url: 'https://numpy.org/doc/2.4/user/basics.types.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'NumPy: random Generator',
      url: 'https://numpy.org/doc/2.4/reference/random/generator.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'What every computer scientist should know about floating-point arithmetic',
      url: 'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html',
    },
  ],
} satisfies LessonMeta;
