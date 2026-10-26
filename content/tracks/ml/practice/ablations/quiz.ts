import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'order-id',
    type: 'choice',
    prompt:
      'Removing order_id changes the validation MAE from 2.094 ± 0.182 to 2.086 ± 0.165 (5 seeds). What do you conclude?',
    options: [
      {
        text: 'order_id has no measurable effect; drop it to keep the model simpler',
        correct: true,
        explain:
          'The change (0.008) is far smaller than the seed-to-seed spread (about 0.17), so the data cannot tell the two models apart. A simpler model is the safer choice.',
      },
      {
        text: 'order_id hurts the model, because MAE went down without it',
        correct: false,
        explain:
          'A difference this much smaller than the noise is not evidence either way; another set of seeds could reverse it.',
      },
      {
        text: 'order_id helps, because it is a unique identifier',
        correct: false,
        explain: 'Unique IDs carry no information about delivery time, and the ablation shows no benefit.',
      },
    ],
  },
  {
    id: 'slice',
    type: 'choice',
    prompt:
      'With region left out of the baseline, the rural MAE is 4.896 (seed 0) while city and suburb are 3.462 and 2.288. What is the best next step?',
    options: [
      {
        text: 'Check what is different about rural deliveries and add a feature that captures it, such as region',
        correct: true,
        explain:
          'Error analysis points at where the model fails; the fix is information the model lacks there. Adding region brings the rural MAE to 1.982.',
      },
      {
        text: 'Train longer',
        correct: false,
        explain:
          'This model is fitted exactly by least squares; more training cannot add information it does not have.',
      },
      {
        text: 'Remove rural deliveries from the validation set',
        correct: false,
        explain:
          'That hides the problem from the metric while the model keeps failing on real rural deliveries.',
      },
    ],
  },
  {
    id: 'one-at-a-time',
    type: 'choice',
    prompt:
      'Why does an ablation remove one component at a time and keep everything else fixed, including the seeds?',
    options: [
      {
        text: 'So any change in the metric can be attributed to that one component',
        correct: true,
        explain:
          'If two things change at once, you cannot tell which caused the difference. Same seeds make each comparison paired.',
      },
      {
        text: 'Because removing two components is not allowed',
        correct: false,
        explain:
          'You can ablate groups too (for example all weather features), but the group is then the one thing that changes.',
      },
      {
        text: 'To make training faster',
        correct: false,
        explain: 'Ablations cost more runs, not fewer. They buy understanding, not speed.',
      },
    ],
  },
  {
    id: 'delta',
    type: 'numeric',
    prompt:
      'The baseline MAE is 2.094. Without distance it is 9.679. By how many minutes does removing distance increase the MAE?',
    answer: 7.585,
    tolerance: 0.001,
    hint: 'Subtract the baseline from the ablated score.',
    explain:
      '9.679 − 2.094 = 7.585 minutes, about 40 times the seed spread: by far the most important component, as the true rule (2.5 minutes per km over 0.5 to 15 km) predicts.',
  },
  {
    id: 'workflow',
    type: 'order',
    prompt: 'Put an error-analysis-and-ablation loop in order.',
    items: [
      'Score the baseline on several seeds to measure the noise',
      'Group validation errors by slices and find the worst one',
      'Form a hypothesis about what the model is missing there',
      'Change one component and re-score on the same seeds',
      'Keep the change only if it beats the noise',
    ],
    explain: 'Noise first, then where it fails, then one controlled change at a time.',
  },
];

export const ablateExercise: Exercise = {
  id: 'leave-one-out',
  prompt:
    'Write `ablate(components, score)` that returns, for each component, how much the score changes when that component alone is removed.',
  starter: `def ablate(components, score):
    # score(list_of_components) returns a validation error (lower is better).
    # Return {name: score(without name) - score(all components)}.
    pass`,
  hints: [
    'Compute the baseline once: `base = score(components)`.',
    'For each name, build the list without it: `[c for c in components if c != name]`.',
    'A positive change means removing the component made the error worse, so the component helps.',
  ],
  solution: `def ablate(components, score):
    base = score(components)
    return {
        name: score([c for c in components if c != name]) - base
        for name in components
    }`,
  explanation:
    'Leave-one-out ablation keeps every other component fixed, so each difference is attributable to one component. In practice score() should average over several seeds and you should report the spread next to each difference.',
  tests: `calls = []
def score(used):
    calls.append(list(used))
    return 10 - 4 * ("distance" in used) - 1 * ("rain" in used)
out = ablate(["distance", "rain", "order_id"], score)
assert isinstance(out, dict), 'return a dict'
assert out == {"distance": 4, "rain": 1, "order_id": 0}, f'expected distance 4, rain 1, order_id 0, got {out}'
assert ["distance", "rain", "order_id"] in calls, 'score the full baseline'
assert ["rain", "order_id"] in calls, 'remove one component at a time, keeping the order of the rest'`,
};
