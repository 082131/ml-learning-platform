import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'gini-node',
    type: 'numeric',
    prompt: 'A node holds 3 Adelie, 1 Chinstrap and 0 Gentoo penguins. What is its Gini impurity?',
    answer: 0.375,
    tolerance: 0.001,
    hint: 'The fractions are 3/4, 1/4 and 0. Square them, add, and subtract from 1.',
    explain: '1 − ((3/4)² + (1/4)² + 0²) = 1 − (9/16 + 1/16) = 6/16 = 0.375.',
  },
  {
    id: 'weighted',
    type: 'numeric',
    prompt:
      'A split of the 14 toy penguins sends 6 Adelie left and 4 Chinstrap + 4 Gentoo right. What is its weighted Gini? (3 decimals)',
    answer: 0.286,
    tolerance: 0.001,
    hint: 'The left side is pure (Gini 0). The right side is a 50/50 mix of two classes. Weight each side by its share of the 14.',
    explain:
      'Left: 0. Right: 1 − (0.5² + 0.5²) = 0.5. Weighted: 6/14 · 0 + 8/14 · 0.5 = 4/14 ≈ 0.286, the root split the tree chose (bill_length_mm ≤ 41.95).',
  },
  {
    id: 'why-weight',
    type: 'choice',
    prompt: 'Why does the split search weight each side’s Gini by the share of rows it holds?',
    options: [
      {
        text: 'So that splitting off one or two pure rows doesn’t look as good as a split that cleans up most of the node',
        correct: true,
        explain:
          'A tiny pure side has Gini 0, but the big impure side barely changed. Weighting makes the big side count for what it holds.',
      },
      {
        text: 'Because Gini impurity is only defined for nodes with the same number of rows',
        correct: false,
        explain:
          'Gini works on fractions, so it is defined for a node of any size. The weights are about comparing splits.',
      },
      {
        text: 'To make the weighted Gini always fall as the tree gets deeper',
        correct: false,
        explain:
          'Weighting doesn’t guarantee that. The weighted Gini of the best split is never above the parent’s Gini, but that comes from Gini being concave, not from the weights alone.',
      },
      {
        text: 'Because scikit-learn requires both sides to have equal size',
        correct: false,
        explain:
          'Sides can be any size of at least min_samples_leaf (1 by default); the root split here is 6 against 8.',
      },
    ],
  },
  {
    id: 'forest-diversity',
    type: 'choice',
    prompt: 'In a random forest, what makes the trees different from each other?',
    options: [
      {
        text: 'Each tree trains on its own bootstrap sample, and each split only tries a random subset of the features',
        correct: true,
        explain:
          'Both are random draws from the seed. Different data and different candidate features give trees that make different mistakes, which the vote averages out.',
      },
      {
        text: 'Each tree gets a different max_depth',
        correct: false,
        explain: 'All trees share the forest’s settings; by default they are all grown to full depth.',
      },
      {
        text: 'Each tree is trained on the errors of the previous one',
        correct: false,
        explain: 'That is gradient boosting. Forest trees are independent and could be grown in parallel.',
      },
      {
        text: 'Each tree uses a different impurity measure',
        correct: false,
        explain: 'The criterion (Gini by default) is the same for every tree.',
      },
    ],
  },
  {
    id: 'boost-target',
    type: 'choice',
    prompt:
      'With squared-error loss, what does the stump added at stage m of gradient boosting learn to predict?',
    options: [
      {
        text: 'The residuals y − Fₘ₋₁(x): what the model built so far still gets wrong',
        correct: true,
        explain:
          'Each stage corrects the current errors. For squared error those residuals are the negative gradient of the loss, hence the name.',
      },
      {
        text: 'The original target y, on a bootstrap sample',
        correct: false,
        explain: 'That describes bagging. In boosting every stage sees all rows but a different target.',
      },
      {
        text: 'The mean of y',
        correct: false,
        explain: 'Only the starting prediction F₀ is the mean. Every stage after it fits residuals.',
      },
      {
        text: 'The residuals of the very first model F₀, at every stage',
        correct: false,
        explain:
          'The residuals are recomputed after every stage, so each stump sees the errors that are left.',
      },
    ],
  },
  {
    id: 'search-order',
    type: 'order',
    prompt: 'Put the steps of choosing one split at a tree node in order.',
    items: [
      'For each feature, sort its distinct values',
      'Take the midpoint of each pair of neighboring values as a candidate threshold',
      'Compute the weighted Gini of the two sides for each candidate',
      'Keep the feature and threshold with the lowest weighted Gini',
      'Send the rows left or right and repeat on each side',
    ],
    explain:
      'That is the greedy CART search: try every candidate, keep the best one, then recurse until a node is pure or max_depth is reached.',
  },
];

export const giniExercise: Exercise = {
  id: 'tree-best-split',
  prompt:
    'Write `gini(labels)` and `best_split(xs, ys)`. best_split returns `(threshold, weighted_gini)` for the best midpoint threshold, keeping the first one on a tie.',
  starter: `def gini(labels):
    # 1 - sum of squared class fractions; 0 for an empty list
    pass


def best_split(xs, ys):
    # try the midpoint between each pair of neighboring sorted distinct values of xs
    pass`,
  hints: [
    'For gini: `n = len(labels)`, return 0 if n is 0, else `1 - sum((labels.count(c) / n) ** 2 for c in set(labels))`.',
    'Candidate thresholds: `values = sorted(set(xs))`, then `(a + b) / 2 for a, b in zip(values, values[1:])`.',
    'For each threshold, build `left = [y for x, y in zip(xs, ys) if x <= t]` and `right` likewise, then weight each side’s gini by `len(side) / len(ys)`. Only replace the best when the score is strictly lower.',
  ],
  solution: `def gini(labels):
    n = len(labels)
    if n == 0:
        return 0.0
    return 1 - sum((labels.count(c) / n) ** 2 for c in set(labels))


def best_split(xs, ys):
    values = sorted(set(xs))
    best = None
    for a, b in zip(values, values[1:]):
        t = (a + b) / 2
        left = [y for x, y in zip(xs, ys) if x <= t]
        right = [y for x, y in zip(xs, ys) if x > t]
        score = len(left) / len(ys) * gini(left) + len(right) / len(ys) * gini(right)
        if best is None or score < best[1]:
            best = (t, score)
    return best`,
  explanation:
    'gini turns class fractions into an impurity between 0 (pure) and 1 − 1/k. best_split scores every midpoint threshold with the size-weighted Gini of both sides and keeps the lowest, exactly what a decision tree does for one feature at one node.',
  tests: `assert gini([]) == 0, 'an empty node has impurity 0'
assert gini(["A", "A", "A"]) == 0, 'a pure node has impurity 0'
assert abs(gini(["A", "B"]) - 0.5) < 1e-12, 'a 50/50 node of two classes has gini 0.5'
assert abs(gini(["A", "A", "A", "B"]) - 0.375) < 1e-12, '3 A and 1 B: 1 - (9/16 + 1/16) = 0.375'
assert best_split([1, 2, 3, 4], ["a", "a", "b", "b"]) == (2.5, 0.0), 'x <= 2.5 separates the two classes perfectly'
t, s = best_split([1, 2, 3, 4], ["a", "b", "a", "b"])
assert t == 1.5 and abs(s - 1 / 3) < 1e-12, 'on a tie keep the first threshold, 1.5 (weighted gini 1/3)'
xs = [41.1, 36.6, 38.7, 39, 38.1, 35.6, 46.1, 42.8, 48.4, 47.3, 43.2, 52.8, 47.5, 50.2]
ys = ["Adelie"] * 6 + ["Gentoo"] * 4 + ["Chinstrap"] * 4
t, s = best_split(xs, ys)
assert t == 41.95 and abs(s - 4 / 14) < 1e-12, 'on the 14 toy penguins the best bill-length split is 41.95'`,
};
