import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'leak',
    type: 'choice',
    prompt:
      'A new export adds a column logged_minutes. With it the validation MAE drops from 2.11 to 0.24 minutes. What should the pipeline do?',
    options: [
      {
        text: 'Block the run: a feature that almost equals the label is a leak, and the score is too good to be true',
        correct: true,
        explain:
          'logged_minutes is the delivery time recorded after the delivery, so it is not known when the prediction is needed. The leak check (|corr| 1.000 against a limit of 0.95) stops the run before training.',
      },
      {
        text: 'Ship it: the gate is about a maximum error, and 0.24 is far below it',
        correct: false,
        explain:
          'Gates on a maximum error cannot catch leaks; a leak makes the metric look better, not worse.',
      },
      {
        text: 'Retrain with more data to confirm',
        correct: false,
        explain: 'More data with the same leaked column gives the same misleading result.',
      },
    ],
  },
  {
    id: 'skew',
    type: 'choice',
    prompt:
      'Training uses the region, but the production request omits it, so serving treats every delivery as city. Which checks catch this?',
    options: [
      {
        text: 'The directional test "rural is slower than city" and the rural slice gate, both of which call the serving code',
        correct: true,
        explain:
          'Through the serving code a rural request predicts exactly the same as a city one (+0.00 min), and the rural slice MAE is 7.87. Tests that only call the training code would pass.',
      },
      {
        text: 'The schema check',
        correct: false,
        explain: 'The data is fine. The fault is in how production builds features: training-serving skew.',
      },
      {
        text: 'None: the model was trained correctly',
        correct: false,
        explain: 'Correct training does not help if production feeds the model different features.',
      },
    ],
  },
  {
    id: 'loosen',
    type: 'choice',
    prompt:
      'With region ignored at serving, someone raises the gates to MAE 5.0 and slice MAE 8.0. The metric and slice gates now pass. Is the model safe to ship?',
    options: [
      {
        text: 'No: the directional test still fails, and the thresholds were moved to fit the result',
        correct: true,
        explain:
          'Gates are agreed before looking at the model. Here the behavioral test still blocks the release, which is why a pipeline uses several kinds of check.',
      },
      {
        text: 'Yes: every gate passes',
        correct: false,
        explain:
          'Not every check passes: "rural vs city" fails. And gates loosened after seeing the result no longer protect anything.',
      },
    ],
  },
  {
    id: 'interval',
    type: 'numeric',
    prompt:
      'The validation MAE is 2.11 with a 95% bootstrap interval of 1.77 to 2.46. How wide is the interval, in minutes?',
    answer: 0.69,
    tolerance: 0.005,
    hint: 'Subtract the lower end from the upper end.',
    explain:
      '2.46 − 1.77 = 0.69 minutes. With only 50 validation rows, a gate at 2.5 is close to the top of the interval: a slightly unlucky split could fail it.',
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the stages of the evaluation pipeline in the order they run.',
    items: [
      'Data checks (schema, leakage, split overlap)',
      'Train, then a smoke test of the predictions',
      'Behavioral tests through the serving code',
      'Metric gate on the validation MAE',
      'Slice gates per region, then the release decision',
    ],
    explain:
      'Cheap checks first: a failed data check stops the pipeline before it spends anything on training.',
  },
];

export const invarianceExercise: Exercise = {
  id: 'invariance-test',
  prompt:
    'Write `invariance_failures(predict, request, field, values, tol)` that returns every value of `field` for which the prediction differs from the original request’s prediction by more than `tol`.',
  starter: `def invariance_failures(predict, request, field, values, tol):
    # predict(request_dict) returns a number.
    # Change request[field] to each value in turn (without modifying request),
    # and collect the values whose prediction moves by more than tol.
    pass`,
  hints: [
    'Compute the reference once: `base = predict(request)`.',
    'Build a changed copy with `{**request, field: value}` so the original stays untouched.',
    'Compare `abs(predict(changed) - base) > tol` and keep the values that fail, in order.',
  ],
  solution: `def invariance_failures(predict, request, field, values, tol):
    base = predict(request)
    return [v for v in values
            if abs(predict({**request, field: v}) - base) > tol]`,
  explanation:
    'An invariance test says that some change should not matter, for example the customer name or the order ID for a delivery time. Any value that moves the prediction is a sign the model learned something it should not have.',
  tests: `def predict(r):
    return 10 + 2 * r["km"] + (0.5 if r["name"].startswith("Z") else 0)
req = {"km": 3.0, "name": "Ana"}
out = invariance_failures(predict, req, "name", ["Bo", "Zoe", "Kai", "Zed"], 0.1)
assert out == ["Zoe", "Zed"], f'expected ["Zoe", "Zed"], got {out}'
assert req == {"km": 3.0, "name": "Ana"}, 'do not modify the request'
assert invariance_failures(predict, req, "name", ["Bo"], 0.1) == [], 'an unchanged prediction is not a failure'`,
};
