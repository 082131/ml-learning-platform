import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own project before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'mismatch',
    type: 'choice',
    prompt:
      'BM25 ranks hashlib third for "check that a download was not corrupted". Which failure category is this, and what could fix it?',
    options: [
      {
        text: 'Vocabulary mismatch: the page never says "download" or "corrupted"; embedding search or query expansion can match the meaning',
        correct: true,
        explain: 'Keyword search only scores shared terms. Embeddings place paraphrases near each other.',
      },
      {
        text: 'A label error',
        correct: false,
        explain: 'hashlib is the right answer; the system did not find it first.',
      },
    ],
  },
  {
    id: 'freeze',
    type: 'choice',
    prompt: 'Why freeze a test third of the queries before tuning the fusion weight?',
    options: [
      {
        text: 'A setting tuned on the same queries it is scored on looks better than it will be on new questions',
        correct: true,
        explain:
          'The same rule as a test set for any model: tune on development data, report once on held-out data.',
      },
      {
        text: 'To make evaluation faster',
        correct: false,
        explain: 'Speed is not the reason; an honest estimate is.',
      },
    ],
  },
  {
    id: 'mrr',
    type: 'numeric',
    prompt:
      'Five queries find their first relevant file at ranks 1, 1, 1, 1 and 3. What is the mean reciprocal rank? (Two decimals.)',
    answer: 0.87,
    tolerance: 0.005,
    hint: 'Average of 1/rank over the queries.',
    explain: '(1 + 1 + 1 + 1 + 1/3) / 5 = 0.867, as the demo run prints.',
  },
  {
    id: 'per-type',
    type: 'choice',
    prompt: 'Embeddings beat BM25 overall by 0.04 recall@5 on 40 queries. What should the report add?',
    options: [
      {
        text: 'Results per query type and the number of queries in each, because the overall gain may come from one type and is two queries’ worth',
        correct: true,
        explain:
          '0.04 of 40 is about 2 queries. The per-type view often shows each method winning somewhere.',
      },
      {
        text: 'Nothing; the higher number wins',
        correct: false,
        explain: 'A difference that small on few queries needs context before it supports a decision.',
      },
    ],
  },
];

export const metricsExercise: Exercise = {
  id: 'retrieval-metrics',
  prompt:
    'Write `retrieval_metrics(rankings, relevant, k)`: given each query’s ranked list of files and its set of relevant files, return (recall@k, MRR), where recall@k is the share of queries with a relevant file in the top k.',
  starter: `def retrieval_metrics(rankings, relevant, k):
    # rankings: list of ranked file lists, one per query
    # relevant: list of sets of relevant files, one per query
    # Return (recall_at_k, mrr). A query with no relevant file in its ranking adds 0 to both.
    pass`,
  hints: [
    'For each query, find the 1-based rank of the first file in its ranking that is in its relevant set.',
    'recall@k counts queries whose first relevant rank is ≤ k; MRR averages 1 / rank (0 when none is found).',
    'Divide both sums by the number of queries.',
  ],
  solution: `def retrieval_metrics(rankings, relevant, k):
    hits, reciprocal = 0, 0.0
    for ranked, rel in zip(rankings, relevant):
        first = next((i + 1 for i, f in enumerate(ranked) if f in rel), None)
        if first is not None:
            hits += first <= k
            reciprocal += 1 / first
    n = len(rankings)
    return hits / n, reciprocal / n`,
  explanation:
    'Both metrics only look at the first relevant result. That suits search where one good page answers the question; for questions needing several pages, also measure how many relevant files appear in the top k.',
  tests: `rankings = [["a", "b", "c"], ["b", "a", "c"], ["c", "b", "a"], ["b", "c", "d"]]
relevant = [{"a"}, {"a"}, {"a", "b"}, {"a"}]
r, m = retrieval_metrics(rankings, relevant, 1)
assert abs(r - 0.25) < 1e-12, f"only the first query has a relevant file at rank 1: expected 0.25, got {r}"
assert abs(m - (1 + 0.5 + 0.5 + 0) / 4) < 1e-12, f"expected MRR 0.5, got {m}"
r, m = retrieval_metrics(rankings, relevant, 2)
assert abs(r - 0.75) < 1e-12, f"expected recall@2 0.75, got {r}"`,
};
