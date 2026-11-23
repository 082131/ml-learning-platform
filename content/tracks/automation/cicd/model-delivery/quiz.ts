import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ci-vs-cd',
    type: 'choice',
    prompt: 'Which question does continuous delivery answer that CI does not?',
    options: [
      { text: 'Does the code still lint and pass its unit tests?', correct: false, explain: 'That is CI, on every change.' },
      { text: 'Is this trained model good and safe enough to release?', correct: true, explain: 'CD turns a candidate into a release: gates against production, staged rollout, approval, rollback.' },
      { text: 'Does the repository build on all supported Python versions?', correct: false, explain: 'A build matrix is part of CI.' },
    ],
  },
  {
    id: 'slice-gate',
    type: 'choice',
    prompt: 'A retrained model raises overall AUC from 0.900 to 0.915 but drops one region’s AUC from 0.86 to 0.82. The gate allows a 0.02 drop per slice. What should happen?',
    options: [
      { text: 'Promote: the average improved by more than the minimum gain', correct: false, explain: 'Averages hide regressions; that region’s customers get a worse model.' },
      { text: 'Promote to staging only, and let production decide', correct: false, explain: 'A failed automatic gate stops the release. Staging is for packaging and serving checks, not for overriding the gate.' },
      { text: 'Block: a 0.04 drop on one slice exceeds the 0.02 tolerance', correct: true, explain: '0.86 − 0.82 = 0.04 > 0.02. Investigate the slice before any release.' },
    ],
  },
  {
    id: 'oidc',
    type: 'choice',
    prompt: 'What does permissions: id-token: write let a GitHub Actions job do?',
    options: [
      { text: 'Request a short-lived OIDC token to get temporary cloud credentials', correct: true, explain: 'The cloud trusts tokens from your repository and branch; no long-lived keys are stored in secrets.' },
      { text: 'Write new secrets into the repository for later jobs', correct: false, explain: 'Jobs cannot write secrets. id-token concerns the job’s identity token.' },
      { text: 'Sign commits with the repository’s GPG key', correct: false, explain: 'Commit signing is unrelated to the id-token permission.' },
    ],
  },
  {
    id: 'same-eval',
    type: 'choice',
    prompt: 'Why must the champion be re-scored on the same evaluation set as the challenger, instead of using its AUC from launch day?',
    options: [
      { text: 'MLflow deletes old metrics after 30 days', correct: false, explain: 'Registries keep metrics; the problem is what they were measured on.' },
      { text: 'Old and new numbers come from different data, so the gap mixes data and model', correct: true, explain: 'Data drifts. Only scores on identical rows compare the models.' },
      { text: 'AUC is not comparable across model versions', correct: false, explain: 'It is comparable, on the same data.' },
    ],
  },
  {
    id: 'order-release',
    type: 'order',
    prompt: 'Order the stages of a model release.',
    items: ['Train the challenger on validated data', 'Gate it against the champion on the same evaluation set', 'Deploy to staging and smoke-check', 'Wait for the production approval', 'Canary 10% of traffic, then roll out or roll back'],
    explain: 'Each stage is cheaper than the next and catches different failures. Approval comes after the evidence exists.',
  },
];

export const gateExercise: Exercise = {
  id: 'gate-decision',
  prompt:
    'Write `decide(candidate, champion, min_gain, latency_budget, slice_tolerance, data_ok, approved)`. `candidate` and `champion` are dicts with "auc", "p95" and "slices" (a list of per-slice AUCs, same order). Return "blocked" if data_ok is False, the AUC gain is below min_gain, any slice drops by more than slice_tolerance, or the candidate’s p95 exceeds the budget. Otherwise return "production" if approved, else "staging". Round differences to 6 decimals before comparing.',
  starter: `def decide(candidate, champion, min_gain, latency_budget, slice_tolerance, data_ok, approved):
    return "production"`,
  hints: [
    'gain = round(candidate["auc"] - champion["auc"], 6); worst = round(max(c - n for c, n in zip(champion["slices"], candidate["slices"])), 6).',
    'Check every blocking rule first; only then look at the approval.',
  ],
  solution: `def decide(candidate, champion, min_gain, latency_budget, slice_tolerance, data_ok, approved):
    gain = round(candidate["auc"] - champion["auc"], 6)
    worst = round(max(c - n for c, n in zip(champion["slices"], candidate["slices"])), 6)
    if not data_ok or gain < min_gain or worst > slice_tolerance or candidate["p95"] > latency_budget:
        return "blocked"
    return "production" if approved else "staging"`,
  explanation:
    'Automatic gates decide whether a release is possible; the approval decides when. Rounding keeps 0.912 − 0.900 = 0.01200000000000001 from failing a 0.012 threshold by accident.',
  tests: `champ = {"auc": 0.9, "p95": 72, "slices": [0.91, 0.89, 0.86]}
good = {"auc": 0.912, "p95": 74, "slices": [0.92, 0.9, 0.87]}
assert decide(good, champ, 0.005, 100, 0.02, True, False) == "staging"
assert decide(good, champ, 0.005, 100, 0.02, True, True) == "production"
assert decide(good, champ, 0.012, 100, 0.02, True, True) == "production"
assert decide(good, champ, 0.005, 100, 0.02, False, True) == "blocked"
assert decide({"auc": 0.915, "p95": 70, "slices": [0.94, 0.92, 0.82]}, champ, 0.005, 100, 0.02, True, True) == "blocked"
assert decide({"auc": 0.918, "p95": 131, "slices": [0.92, 0.91, 0.88]}, champ, 0.005, 100, 0.02, True, True) == "blocked"`,
};
