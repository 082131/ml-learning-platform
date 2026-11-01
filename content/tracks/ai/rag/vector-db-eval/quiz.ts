import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ann-tradeoff',
    type: 'choice',
    prompt: 'You raise nprobe on an IVF index from 2 to 8. What happens?',
    options: [
      {
        text: 'Recall goes up and each query compares more vectors, so it gets slower',
        correct: true,
        explain:
          'Searching more clusters finds neighbors that sat just across a cluster boundary, at the cost of more comparisons.',
      },
      {
        text: 'The index has to be rebuilt',
        correct: false,
        explain:
          'nprobe is a query-time setting. nlist (the number of clusters) is fixed when the index is built.',
      },
      {
        text: 'Recall goes down because there is more noise',
        correct: false,
        explain:
          'Searching more clusters can only add true neighbors; at nprobe = nlist the search is exact.',
      },
    ],
  },
  {
    id: 'model-version',
    type: 'choice',
    prompt: 'You switch to a better embedding model. What must happen to the vectors already stored?',
    options: [
      {
        text: 'Re-embed every chunk with the new model; until then, query only vectors from one model',
        correct: true,
        explain:
          'Vectors from different models live in different spaces. A cosine between them is meaningless.',
      },
      {
        text: 'Nothing: all embeddings of the same size are compatible',
        correct: false,
        explain:
          'Two 384-number vectors from different models are as comparable as two phone numbers from different countries.',
      },
      {
        text: 'Only rebuild the index',
        correct: false,
        explain: 'The index organizes the vectors; the vectors themselves must be recomputed.',
      },
    ],
  },
  {
    id: 'recall',
    type: 'numeric',
    prompt:
      'On 50 evaluation questions, the answer passage is ranked 1st for 30, 2nd to 5th for 12, and missing from the top 5 for 8. What is recall@5?',
    answer: 0.84,
    tolerance: 0.001,
    hint: 'Count the questions whose answer is anywhere in the top 5.',
    explain: '(30 + 12) / 50 = 42 / 50 = 0.84. Recall@1 would be 30 / 50 = 0.60.',
  },
  {
    id: 'mrr',
    type: 'numeric',
    prompt: 'Three questions have their answer at ranks 1, 4 and (missing). What is the MRR? (Two decimals.)',
    answer: 0.42,
    tolerance: 0.005,
    hint: 'Average 1/rank, with 0 for a miss.',
    explain: '(1 + 1/4 + 0) / 3 = 1.25 / 3 ≈ 0.42.',
  },
  {
    id: 'reranker',
    type: 'choice',
    prompt:
      'A cross-encoder reranker raises recall@3 on your evaluation set from 0.82 to 0.84 and adds 300 ms to every request. What do you do?',
    options: [
      {
        text: 'Probably skip it, or look for a cheaper fix: 2 points may be noise on a small set and the latency is certain',
        correct: true,
        explain:
          'Decide with numbers on both sides. Check whether the gain holds on more questions, and whether hybrid search gets it for less.',
      },
      {
        text: 'Always add it: rerankers improve RAG',
        correct: false,
        explain:
          'They often do, but not always enough to pay for themselves. The point of measuring is to find out.',
      },
      {
        text: 'Increase k to 20 instead, since more chunks can only help',
        correct: false,
        explain:
          'More chunks cost tokens and can distract the model; measure answer quality, not only recall.',
      },
    ],
  },
];

export const recallExercise: Exercise = {
  id: 'recall-at-k',
  prompt:
    'Write `recall_at_k(ranked, gold, k)` where `ranked[i]` is the list of ids returned for question i and `gold[i]` its answer id.',
  starter: `def recall_at_k(ranked, gold, k):
    pass`,
  hints: [
    'A question counts as a hit when gold[i] is in ranked[i][:k].',
    'Divide the hits by the number of questions.',
  ],
  solution: `def recall_at_k(ranked, gold, k):
    hits = sum(g in r[:k] for r, g in zip(ranked, gold))
    return hits / len(gold)`,
  explanation:
    'True counts as 1 when summed, so the generator counts hits directly. Real evaluations also report recall at several k and break results down by question type.',
  tests: `ranked = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]]
gold = ["a", "f", "x"]
assert recall_at_k(ranked, gold, 1) == 1 / 3, 'only the first question has its answer at rank 1'
assert recall_at_k(ranked, gold, 3) == 2 / 3, 'the second answer is at rank 3; the third is missing'
assert recall_at_k(ranked, gold, 2) == 1 / 3, 'rank 3 is outside the top 2'`,
};
