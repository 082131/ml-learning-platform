import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'skip-cascade',
    type: 'choice',
    prompt: 'data-checks fails. train-smoke needs data-checks; evaluate needs train-smoke; report needs evaluate and has if: always(). What happens to evaluate and report?',
    options: [
      { text: 'evaluate is skipped; report runs', correct: true, explain: 'train-smoke is skipped because a need failed, so evaluate is skipped because its need was skipped. always() makes report run regardless.' },
      { text: 'Both are skipped, since a failure stops the whole workflow', correct: false, explain: 'Independent jobs keep running, and always() overrides the default success() condition.' },
      { text: 'evaluate runs on the last good model; report runs', correct: false, explain: 'Jobs do not fall back to earlier results. evaluate’s default condition is success() of its needs.' },
    ],
  },
  {
    id: 'pending-check',
    type: 'choice',
    prompt: 'A PR changes only README.md. The ml-ci workflow has paths-ignore for **.md and its test job is a required check. What does the PR show?',
    options: [
      { text: 'The required check passes automatically', correct: false, explain: 'GitHub does not invent a result for a workflow that never ran.' },
      { text: 'The required check fails with "skipped"', correct: false, explain: 'There is no run, so there is no failure either.' },
      { text: 'The check stays pending and the merge is blocked', correct: true, explain: 'GitHub’s docs: checks of a workflow skipped by path filtering stay pending, and a PR requiring them cannot merge.' },
    ],
  },
  {
    id: 'smoke',
    type: 'choice',
    prompt: 'Why train on a 2,000-row sample in CI instead of the full dataset?',
    options: [
      { text: 'A small sample gives a more accurate estimate of quality', correct: false, explain: 'It gives a worse estimate. Quality is measured in the training pipeline, not in CI.' },
      { text: 'CI should prove the code runs end to end, quickly, on every change', correct: true, explain: 'A smoke run catches broken code paths in minutes. Full training belongs in a scheduled or manually triggered pipeline.' },
      { text: 'GitHub-hosted runners cannot load files larger than 2,000 rows', correct: false, explain: 'Runners can load far more; the limits are time (6 hours per job) and cost.' },
    ],
  },
  {
    id: 'artifacts',
    type: 'choice',
    prompt: 'train-smoke writes artifacts/model.joblib; evaluate (needs: train-smoke) cannot find it. Why?',
    options: [
      { text: 'needs only orders jobs; each job gets a fresh runner', correct: true, explain: 'Upload the file with actions/upload-artifact and download it in evaluate.' },
      { text: 'joblib files are blocked by GitHub for security reasons', correct: false, explain: 'Any file can be passed as an artifact.' },
      { text: 'evaluate started before train-smoke finished writing', correct: false, explain: 'needs guarantees the order. The file is on a different machine.' },
    ],
  },
  {
    id: 'wall',
    type: 'numeric',
    prompt: 'lint takes 1 min, unit-tests 3, data-checks 2 (all three start together). train-smoke (needs unit-tests and data-checks) takes 4, evaluate (needs train-smoke) 2, build-image (needs lint and evaluate) 3. How many minutes until build-image finishes?',
    answer: 12,
    tolerance: 0,
    hint: 'Follow the longest chain of needs: the critical path.',
    explain: 'train-smoke starts at max(3, 2) = 3 and ends at 7; evaluate ends at 9; build-image starts at max(1, 9) = 9 and ends at 12.',
  },
];

export const workflowExercise: Exercise = {
  id: 'job-statuses',
  prompt:
    'Write `statuses(jobs, failing)`. `jobs` is a dict from job name to `{"needs": [...], "always": bool}`, listed so that every job comes after the jobs it needs. `failing` is a set of jobs whose steps fail. Return a dict from job name to "success", "failure" or "skipped" using GitHub’s rules: a job with `always` runs; otherwise it runs only if every needed job succeeded, and is "skipped" if not. A job that runs is "failure" if it is in `failing`, else "success".',
  starter: `def statuses(jobs, failing):
    return {name: "success" for name in jobs}`,
  hints: [
    'Process jobs in the given order, storing each result as you go.',
    'runs = spec["always"] or all(result[n] == "success" for n in spec["needs"]).',
  ],
  solution: `def statuses(jobs, failing):
    result = {}
    for name, spec in jobs.items():
        runs = spec["always"] or all(result[n] == "success" for n in spec["needs"])
        if not runs:
            result[name] = "skipped"
        else:
            result[name] = "failure" if name in failing else "success"
    return result`,
  explanation:
    'Skips cascade because "skipped" is not "success". That is why reporting and clean-up jobs use always(), and why deploy jobs must not.',
  tests: `jobs = {
    "lint": {"needs": [], "always": False},
    "test": {"needs": [], "always": False},
    "train": {"needs": ["test"], "always": False},
    "build": {"needs": ["lint", "train"], "always": False},
    "report": {"needs": ["build"], "always": True},
}
assert statuses(jobs, set()) == {k: "success" for k in jobs}
assert statuses(jobs, {"test"}) == {"lint": "success", "test": "failure", "train": "skipped", "build": "skipped", "report": "success"}
assert statuses(jobs, {"lint", "report"})["report"] == "failure"
assert statuses(jobs, {"lint"})["build"] == "skipped"`,
};
