import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'hash-prefix',
    type: 'choice',
    prompt: 'The tokenizer turns "unbelievably" into un, ##bel, ##ie, ##va, ##bly. What does "##" mean?',
    options: [
      {
        text: 'The piece continues the previous piece of the same word',
        correct: true,
        explain:
          'WordPiece marks every piece after the first one with ##, so "un" + "##bel" can be told apart from the words "un" and "bel".',
      },
      {
        text: 'The piece is a number',
        correct: false,
        explain: 'Numbers are ordinary pieces such as "402". ## only marks a word continuation.',
      },
      {
        text: 'The piece is unknown to the model',
        correct: false,
        explain: 'Unknown text becomes the single token [UNK]. Pieces with ## are in the vocabulary.',
      },
    ],
  },
  {
    id: 'token-count',
    type: 'numeric',
    prompt:
      'How many tokens does this tokenizer produce for "The movie was not good." (count [CLS] and [SEP])?',
    answer: 8,
    tolerance: 0,
    hint: 'Each of the five words is in the vocabulary, the period is its own token, and two special tokens are added.',
    explain: '[CLS] the movie was not good . [SEP]: 5 words + 1 period + 2 special tokens = 8.',
  },
  {
    id: 'negation',
    type: 'choice',
    prompt:
      '"The movie was good." and "The movie was not good." have a cosine similarity of about 0.80 with all-MiniLM-L6-v2. What does that tell you?',
    options: [
      {
        text: 'The model mostly captures topic and wording; it is not reliable on negation',
        correct: true,
        explain:
          'Both sentences are about the same movie in nearly the same words, so their vectors are close even though the meaning is opposite.',
      },
      {
        text: 'The two sentences mean almost the same thing',
        correct: false,
        explain:
          'They mean opposite things. Cosine similarity measures how close the vectors are, not whether the claims agree.',
      },
      {
        text: 'The embeddings are broken',
        correct: false,
        explain:
          'This is expected behavior for a small sentence-embedding model, and a known limit to test for in your own data.',
      },
    ],
  },
  {
    id: 'unit-length',
    type: 'choice',
    prompt:
      'Two vectors both have length 1. What is the relationship between their dot product and their cosine similarity?',
    options: [
      {
        text: 'They are equal',
        correct: true,
        explain: 'cos θ = a·b / (‖a‖‖b‖), and with ‖a‖ = ‖b‖ = 1 the denominator is 1.',
      },
      {
        text: 'The dot product is the square of the cosine',
        correct: false,
        explain: 'No squaring is involved: for unit vectors the formula reduces to a·b.',
      },
      {
        text: 'There is no fixed relationship',
        correct: false,
        explain: 'There is one whenever the lengths are known; for length 1 the two are the same number.',
      },
    ],
  },
  {
    id: 'pipeline',
    type: 'order',
    prompt: 'Put the steps of a similarity search in order.',
    items: [
      'Embed every document once and store the vectors',
      'Embed the query with the same model',
      'Score every stored vector against the query vector',
      'Return the highest-scoring documents',
    ],
    explain:
      'Documents are embedded ahead of time; at search time only the query is embedded, then compared with each stored vector.',
  },
];

export const topKExercise: Exercise = {
  id: 'top-k',
  prompt:
    'Write `top_k(query, vectors, k)` that returns the indices of the `k` vectors most similar to `query` by cosine similarity, best first. Use plain Python, no NumPy.',
  starter: `import math

def top_k(query, vectors, k):
    # Score each vector by cosine similarity with query, then return the k best indices, best first.
    pass`,
  hints: [
    'Write a `cosine(a, b)` helper first: the dot product divided by the product of the two lengths.',
    'Build a list of `(score, index)` pairs, one per vector.',
    'Sort the indices with `sorted(range(len(vectors)), key=lambda i: scores[i], reverse=True)` and keep the first k.',
  ],
  solution: `import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

def top_k(query, vectors, k):
    scores = [cosine(query, v) for v in vectors]
    return sorted(range(len(vectors)), key=lambda i: scores[i], reverse=True)[:k]`,
  explanation:
    'Every vector gets one cosine score against the query; sorting the indices by score, highest first, and slicing gives the k nearest. Because cosine ignores length, [2, 0] and [1, 0] score the same against [1, 0].',
  tests: `vectors = [[1, 0], [0, 1], [0.9, 0.1], [-1, 0]]
assert top_k([1, 0], vectors, 2) == [0, 2], 'the two vectors pointing most like [1, 0] are at index 0 and 2'
assert top_k([0, 1], vectors, 1) == [1], '[0, 1] is most similar to itself, at index 1'
assert top_k([1, 0], vectors, 4)[-1] == 3, 'the opposite vector [-1, 0] has cosine -1 and comes last'
assert top_k([1, 0], [[5, 0], [0, 1]], 1) == [0], 'length does not matter: [5, 0] points the same way as [1, 0]'`,
};
