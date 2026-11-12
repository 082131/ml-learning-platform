import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's numpy chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'array-view',
    term: 'Array view',
    short:
      'A NumPy array that shares its data with another array, so writing through one changes the other. Basic slicing returns views.',
    long: 'Fancy indexing and boolean masks return copies instead. np.shares_memory(a, b) tells you which one you have.',
    introducedIn: 'python/numpy/indexing-views',
    aliases: ['view', 'copy'],
  },
  {
    id: 'fancy-indexing',
    term: 'Fancy indexing',
    short:
      'Indexing a NumPy array with an array or list of integer positions, such as a[[0, 2, 2]]. The result is always a new array (a copy).',
    introducedIn: 'python/numpy/indexing-views',
    aliases: ['integer array indexing'],
  },
  {
    id: 'integer-overflow',
    term: 'Integer overflow',
    short:
      'What happens when a result does not fit in a fixed-size integer type: NumPy integers wrap around, so int8 127 + 1 becomes -128.',
    long: 'Python’s own int never overflows; NumPy’s fixed-width integers do, usually without an error.',
    introducedIn: 'python/numpy/dtypes-random',
    aliases: ['overflow', 'wraparound'],
  },
  {
    id: 'nan',
    term: 'NaN',
    short:
      '“Not a Number”: a special floating-point value for undefined or missing results. NaN is not equal to anything, including itself.',
    long: 'Use np.isnan(x) or pandas’ isna() to find NaNs; x == np.nan is always False.',
    introducedIn: 'python/numpy/dtypes-random',
    aliases: ['not a number'],
  },
] satisfies GlossaryTerm[];
