// Code for the embeddings lesson. The printouts were produced with NumPy 2.5.3 on CPython 3.13.16;
// embeddings.test.ts checks that the readout reproduces them for several tables.
import {
  EMBEDDING_SOURCE,
  embeddingExperiment,
  embeddingSlots,
  type EmbeddingState,
  type Vec2,
} from '@/lib/deep/embeddings';
import type { CodeExample } from '@/lib/types';

export const TOKENS = ['cat', 'kitten', 'dog', 'puppy', 'car', 'truck', 'apple', 'banana'];

/** Hand-made 2-D vectors: animals point right and up a little, vehicles up-left, fruit down-left. */
export const TABLE: Vec2[] = [
  [3, 1],
  [2, 1],
  [2.5, 2],
  [1.5, 1.5],
  [-1, 3.5],
  [-2, 4],
  [-3, -2],
  [-2.5, -3],
];

const CODE_ID = 'emb-code';

/** One state for the map, the lookup, the code, the trace and the readout. */
export const experiment = embeddingExperiment('emb', { tokens: TOKENS, E: TABLE, a: 0, b: 1 }, CODE_ID);

const slot = (name: string) => (s: unknown) => embeddingSlots(s as EmbeddingState)[name]!;

export const embeddingCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: EMBEDDING_SOURCE,
  slots: { tokens: slot('tokens'), E: slot('E'), a: slot('a'), b: slot('b') },
  annotations: [
    {
      id: 'tokens',
      range: { line: 3, startCol: 9, endCol: 19 },
      match: '{{tokens}}',
      kind: 'parameter',
      title: 'The vocabulary',
      what: 'A toy vocabulary of 8 whole-word tokens; a token’s position is its ID.',
      why: 'In a real model the IDs come from the tokenizer, and the vocabulary has tens of thousands of entries.',
    },
    {
      id: 'E',
      range: { line: 4, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'E: the embedding table',
      what: 'An array with one row per token and one column per dimension, filled from the map above.',
      why: 'Here the numbers are written by hand so you can see them on a plane. In a model, E is a parameter: it starts random and training adjusts it.',
      output: 'shape (8, 2) here; (50257, 768) in GPT-2 small',
    },
    {
      id: 'ids',
      range: { line: 5, startCol: 13, endCol: 18 },
      match: '{{a}}',
      kind: 'parameter',
      title: 'Token IDs',
      what: 'The IDs of the query token a and the token b it is compared with.',
      why: 'They come from the two selects in the experiment, or from selecting a point on the map.',
    },
    {
      id: 'one-hot',
      range: { line: 7, startCol: 10, endCol: 35 },
      match: 'np.eye(len(tokens))[a_id]',
      kind: 'framework',
      title: 'A one-hot vector',
      what: 'np.eye(8) is the 8×8 identity matrix. Its row a_id has a single 1 at position a_id and 0 everywhere else.',
      why: 'One-hot vectors are the simplest numeric form of an ID: as long as the vocabulary, with no notion of similarity (every pair of one-hot vectors is perpendicular).',
      output: 'shape (8,), dtype float64',
    },
    {
      id: 'one-hot-matmul',
      range: { line: 8, startCol: 6, endCol: 17 },
      match: 'one_hot @ E',
      kind: 'math',
      title: 'one_hot @ E',
      what: 'A (8,) vector times an (8, 2) matrix: each column of the result is Σ_k one_hot[k] · E[k][j].',
      why: 'Only the term with the 1 survives, so the product is exactly row a_id of E. An embedding layer is a matrix multiplication by a one-hot vector.',
      output: 'shape (2,)',
    },
    {
      id: 'index',
      range: { line: 9, startCol: 6, endCol: 13 },
      match: 'E[a_id]',
      kind: 'syntax',
      title: 'E[a_id]: the lookup',
      what: 'Reads row a_id of E directly.',
      why: 'Same numbers, without multiplying by thousands of zeros. Frameworks implement embedding layers this way (nn.Embedding in PyTorch).',
    },
    {
      id: 'dot',
      range: { line: 12, startCol: 6, endCol: 11 },
      match: 'a @ b',
      kind: 'math',
      title: 'a @ b: the dot product',
      what: 'For two 1-D arrays, @ is the dot product: a₀b₀ + a₁b₁.',
      why: 'It is large when the vectors point the same way and are long. Dividing by the lengths keeps only the direction.',
    },
    {
      id: 'norm',
      range: { line: 12, startCol: 15, endCol: 32 },
      match: 'np.linalg.norm(a)',
      kind: 'framework',
      title: 'np.linalg.norm(a)',
      what: 'The length of a: √(a₀² + a₁²).',
      why: 'Dividing the dot product by both lengths gives the cosine of the angle between the vectors.',
    },
    {
      id: 'print',
      range: { line: 13, startCol: 6, endCol: 18 },
      match: 'f"{cos:.4f}"',
      kind: 'syntax',
      title: 'f"{cos:.4f}"',
      what: 'Formats the number with exactly 4 digits after the decimal point.',
      why: 'The readout shows these exact characters for the current table.',
    },
  ],
};
