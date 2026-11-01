import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/compression chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'pruning',
    term: 'Pruning',
    short: 'Removing weights (setting them to zero) or whole neurons, channels or layers from a trained model.',
    long: 'Unstructured pruning zeroes individual weights, which saves time only with sparse kernels or hardware support. Structured pruning removes whole rows, channels or heads, so the remaining matrices are smaller and dense.',
    introducedIn: 'inference/compression/quantize-prune-distill',
    aliases: ['magnitude pruning', 'sparsity', 'structured pruning'],
  },
  {
    id: 'knowledge-distillation',
    term: 'Knowledge distillation',
    short: 'Training a smaller student model to match a larger teacher model’s outputs instead of, or as well as, the labels.',
    long: 'The teacher’s outputs are softened with a temperature T > 1 so that the student also learns which wrong answers the teacher found plausible. The teacher can label data that has no human labels.',
    introducedIn: 'inference/compression/quantize-prune-distill',
    aliases: ['distillation', 'teacher-student', 'student model'],
  },
  {
    id: 'softmax-temperature',
    term: 'Softmax temperature',
    short: 'A number T that divides the logits before softmax: T > 1 spreads the probabilities out, T < 1 sharpens them.',
    long: 'softmax(z / T). The order of the classes never changes, only how confident the distribution looks.',
    introducedIn: 'inference/compression/quantize-prune-distill',
    aliases: ['temperature'],
  },
  {
    id: 'sparse-matrix',
    term: 'Sparse matrix (CSR)',
    short: 'A matrix stored as only its nonzero values and their positions.',
    long: 'Compressed sparse row (CSR) keeps the values, a column index for each, and where each row starts. With 4-byte values and 4-byte indices it is smaller than the dense matrix only when fewer than about half the entries are nonzero.',
    introducedIn: 'inference/compression/quantize-prune-distill',
    aliases: ['CSR', 'compressed sparse row'],
  },
] satisfies GlossaryTerm[];
