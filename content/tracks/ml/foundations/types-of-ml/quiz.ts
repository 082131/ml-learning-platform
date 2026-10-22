import type { Exercise, QuizQuestion } from '@/lib/types';

const choice = (
  id: string,
  prompt: string,
  answer: 'supervised' | 'unsupervised' | 'reinforcement',
  why: Record<'supervised' | 'unsupervised' | 'reinforcement', string>,
): QuizQuestion => ({
  id,
  type: 'choice',
  prompt,
  options: (['supervised', 'unsupervised', 'reinforcement'] as const).map((kind) => ({
    text: { supervised: 'Supervised', unsupervised: 'Unsupervised', reinforcement: 'Reinforcement' }[kind],
    correct: kind === answer,
    explain: why[kind],
  })),
});

export const questions: QuizQuestion[] = [
  choice(
    'house-prices',
    'You have 50,000 past house sales, each with its size, location and the price it sold for. You want to predict the price of a house that is about to go on sale. Which kind of learning is this?',
    'supervised',
    {
      supervised:
        'Every example comes with the answer you want to predict (the sale price), so it is supervised. Because the answer is a number, it is called regression.',
      unsupervised: 'The sale price is a label: you know the right answer for every past example.',
      reinforcement:
        'Nothing acts or collects rewards over time here; you predict one number from examples with known answers.',
    },
  ),
  choice(
    'customer-groups',
    'A shop has the purchase history of 100,000 customers and no categories for them. It wants to find groups of customers who buy similar things. Which kind of learning is this?',
    'unsupervised',
    {
      supervised:
        'There is no label to predict: nobody has told the program which group each customer is in.',
      unsupervised:
        'The program looks for structure in the data on its own, like k-means did with the penguins. The groups it finds still need a person to interpret them.',
      reinforcement: 'No agent takes actions and receives rewards; the data is fixed.',
    },
  ),
  choice(
    'robot',
    'A program learns to balance a pole on a moving cart. It can push the cart left or right, and it gets +1 for every moment the pole stays up. Which kind of learning is this?',
    'reinforcement',
    {
      supervised:
        'Nobody gives the right push for each moment. The program only sees how long the pole stayed up.',
      unsupervised: 'The program is not looking for groups in fixed data; it acts and is rewarded.',
      reinforcement:
        'An agent (the program) takes actions in an environment (cart and pole) and learns from rewards. That is reinforcement learning.',
    },
  ),
  choice(
    'spam',
    'The spam filter from the previous lesson learned word scores from emails marked spam or ham. Which kind of learning was it?',
    'supervised',
    {
      supervised:
        'Every training email had a label (spam or ham), and the filter learned to predict it. Predicting a category is called classification.',
      unsupervised:
        'The training emails were labeled by people, so the filter knew the right answer for each one.',
      reinforcement:
        'The filter learned once from a fixed set of labeled emails; it did not act and collect rewards.',
    },
  ),
  {
    id: 'clusters-vs-species',
    type: 'choice',
    prompt:
      'With k = 3, k-means puts most Adelie penguins in one cluster but splits Gentoo and Chinstrap penguins differently from their species. Why?',
    options: [
      {
        text: 'k-means groups points that are close together; it never saw the species, so its groups need not match them',
        correct: true,
        explain:
          'Unsupervised learning finds structure in the features it is given. Chinstrap and Gentoo bills overlap in length, so distance alone does not separate them the way the species labels do.',
      },
      {
        text: 'k-means has a bug: three species should give three matching clusters',
        correct: false,
        explain:
          'Nothing tells k-means what the species are. Matching them would only happen if the species formed three well-separated clumps in these two features.',
      },
      {
        text: 'Supervised learning would have found the same clusters',
        correct: false,
        explain:
          'Supervised learning uses the species labels, so its groups are the species by definition. That is exactly what k-means does not have.',
      },
    ],
  },
  {
    id: 'supervised-steps',
    type: 'order',
    prompt: 'Put the steps of the supervised penguin example in order.',
    items: [
      'Collect penguins with their bill measurements and species (features and labels)',
      'Train: compute each species’ average bill',
      'Measure the bill of a new penguin whose species is unknown',
      'Predict the species whose average bill is closest',
    ],
    explain: 'Labeled data first, then training, then inference on a new example: the supervised recipe.',
  },
];

export const predictExercise: Exercise = {
  id: 'nearest-average-predict',
  prompt:
    'Write `predict(x, y, averages)`: `averages` maps a species name to its average `(bill length, bill depth)`. Return the species whose average is closest to `(x, y)`.',
  starter: `def predict(x, y, averages):
    # Compute the distance from (x, y) to each average and return the closest species.
    pass`,
  hints: [
    'Loop with `for species, (ax, ay) in averages.items():` and compute `((x - ax) ** 2 + (y - ay) ** 2) ** 0.5`.',
    'Keep the best species and its distance in two variables, and replace them when you find a smaller distance.',
    'Or in one line: `min(averages, key=lambda s: (x - averages[s][0]) ** 2 + (y - averages[s][1]) ** 2)`.',
  ],
  solution: `def predict(x, y, averages):
    best, best_distance = None, None
    for species, (ax, ay) in averages.items():
        distance = ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
        if best_distance is None or distance < best_distance:
            best, best_distance = species, distance
    return best`,
  explanation:
    'This is a nearest-centroid classifier: training computed one average per label, and inference picks the closest. The square root does not change which distance is smallest, so leaving it out gives the same answer.',
  tests: `averages = {"Adelie": (39.3, 18.05), "Chinstrap": (48.25, 18.7), "Gentoo": (48.05, 14.75)}
assert predict(45.0, 14.5, averages) == "Gentoo", f'(45.0, 14.5) is closest to the Gentoo average, got {predict(45.0, 14.5, averages)!r}'
assert predict(38.0, 18.0, averages) == "Adelie", 'a short, deep bill is closest to Adelie'
assert predict(50.0, 19.0, averages) == "Chinstrap", 'a long, deep bill is closest to Chinstrap'
assert predict(1.0, 1.0, {"only": (0.0, 0.0)}) == "only", 'with one species, predict must return it'`,
};
