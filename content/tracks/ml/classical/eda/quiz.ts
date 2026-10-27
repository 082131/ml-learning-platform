import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'simpson',
    type: 'choice',
    prompt:
      'Across all 342 penguins, bill length and bill depth have r = −0.235. Within Adelie, Chinstrap and Gentoo separately, r is 0.391, 0.654 and 0.643. What is the best reading?',
    options: [
      {
        text: 'Within a species, longer bills tend to be deeper; the negative overall r comes from mixing species with different bill shapes',
        correct: true,
        explain:
          'Gentoo have long, shallow bills and Adelie short, deep ones. Pooled together they form a downward cloud, while each species slopes upward: Simpson’s paradox, with species as the confounder.',
      },
      {
        text: 'Longer bills are shallower; the per-species numbers are noise',
        correct: false,
        explain:
          'All three species agree, with 68 to 151 penguins each. The pooled number is the misleading one, because it ignores species.',
      },
      {
        text: 'One of the calculations must be wrong, since r can’t change sign',
        correct: false,
        explain:
          'It can. r of a pooled dataset depends on where the groups sit relative to each other, not only on the trend inside each group.',
      },
    ],
  },
  {
    id: 'describe-count',
    type: 'numeric',
    prompt:
      'df has 344 rows. df.describe() reports count 342.0 for bill_length_mm. How many bill lengths are missing?',
    answer: 2,
    tolerance: 0,
    hint: 'describe() counts the values that are present, skipping missing ones.',
    explain:
      '344 − 342 = 2: rows 3 and 271, the penguins with no measurements. Every statistic describe() shows for that column uses those 342 values only.',
  },
  {
    id: 'r-zero',
    type: 'choice',
    prompt: 'Two columns have r ≈ 0. What can you conclude?',
    options: [
      {
        text: 'There is no straight-line trend between them; a curved relationship is still possible',
        correct: true,
        explain:
          'Pearson’s r only measures linear association. y = x² for x from −3 to 3 has r = 0 and a perfect relationship.',
      },
      {
        text: 'They are unrelated',
        correct: false,
        explain:
          'r ≈ 0 rules out a linear trend, not every relationship. Always look at the scatter plot too.',
      },
      {
        text: 'One of them must be constant',
        correct: false,
        explain: 'A constant column makes r undefined (pandas returns NaN), not 0.',
      },
    ],
  },
  {
    id: 'value-counts',
    type: 'choice',
    prompt:
      'df["species"].value_counts() prints Adelie 152, Gentoo 124, Chinstrap 68. Why is this worth checking before training a species classifier?',
    options: [
      {
        text: 'The classes are unbalanced: a model that always says Adelie is right 152 / 344 ≈ 44% of the time, so accuracy must be judged against that',
        correct: true,
        explain:
          'Counts tell you the baseline any model must beat, and whether a rare class has enough examples to learn from.',
      },
      {
        text: 'It shows which species is most accurately measured',
        correct: false,
        explain: 'value_counts counts rows per category. It says nothing about measurement quality.',
      },
      {
        text: 'It is required before calling groupby',
        correct: false,
        explain: 'groupby works without it. value_counts is a check for you, not a step pandas needs.',
      },
    ],
  },
  {
    id: 'causation',
    type: 'choice',
    prompt:
      'Across all penguins, flipper length and body mass have r = 0.871. Which statement does EDA support?',
    options: [
      {
        text: 'Heavier penguins tend to have longer flippers in this sample; whether one causes the other is a separate question',
        correct: true,
        explain:
          'A correlation describes how the columns move together in this data. Causes need a design or knowledge beyond the correlation.',
      },
      {
        text: 'Growing longer flippers makes a penguin heavier',
        correct: false,
        explain:
          'Both may follow from overall body size, species and sex. A correlation alone can’t pick a direction or rule out a confounder.',
      },
      {
        text: 'Body mass predicts flipper length perfectly',
        correct: false,
        explain: 'Only r = ±1 means a perfect line. 0.871 is strong, with plenty of scatter around the line.',
      },
    ],
  },
];

export const pearsonExercise: Exercise = {
  id: 'pearson-function',
  prompt:
    'Write `pearson(xs, ys)` that returns Pearson’s r for two equal-length lists, without NumPy or pandas. Raise `ValueError` when the lengths differ or when either list is constant.',
  starter: `import math

def pearson(xs, ys):
    # 1. Check the lengths.
    # 2. Compute the means, then sxy, sxx and syy.
    # 3. A constant list has sxx == 0 or syy == 0: raise ValueError.
    pass`,
  hints: [
    'mx = sum(xs) / len(xs), and the same for ys.',
    'Loop over zip(xs, ys) and add (x - mx) * (y - my) to sxy, (x - mx) ** 2 to sxx and (y - my) ** 2 to syy.',
    'Return sxy / math.sqrt(sxx * syy) after checking that neither sxx nor syy is 0.',
  ],
  solution: `import math

def pearson(xs, ys):
    if len(xs) != len(ys):
        raise ValueError("xs and ys need the same length")
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    sxy = sxx = syy = 0.0
    for x, y in zip(xs, ys):
        sxy += (x - mx) * (y - my)
        sxx += (x - mx) ** 2
        syy += (y - my) ** 2
    if sxx == 0 or syy == 0:
        raise ValueError("r is undefined for a constant list")
    return sxy / math.sqrt(sxx * syy)`,
  explanation:
    'sxy collects how each pair moves relative to the means; dividing by the square root of sxx · syy removes the units, so r stays between −1 and 1. A constant list has no spread, so r would divide by zero; pandas returns NaN in that case, and here we raise instead.',
  tests: `assert round(pearson([1, 2, 3], [2, 4, 5]), 3) == 0.982, 'pearson([1, 2, 3], [2, 4, 5]) should be about 0.982'
assert round(pearson([1, 2, 3], [10, 20, 30]), 9) == 1.0, 'points on a rising line give r = 1'
assert round(pearson([1, 2, 3], [3, 2, 1]), 9) == -1.0, 'points on a falling line give r = -1'
assert round(pearson([46.5, 47.0, 46.7, 47.6, 51.5, 51.9], [17.9, 17.3, 17.9, 18.3, 18.7, 19.5]), 3) == 0.876, 'the 6 Chinstrap penguins of the lesson give 0.876'
for bad in ([1, 2], [1, 2, 3]), ([1, 1, 1], [1, 2, 3]):
    try:
        pearson(*bad)
        raised = False
    except ValueError:
        raised = True
    assert raised, f'pearson{bad} should raise ValueError'`,
};
