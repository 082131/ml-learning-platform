import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'change-c',
    type: 'choice',
    prompt:
      'The last run used data v1, features f1 and C = 1. You change only C to 10 and run again. With chained cache keys, which steps run?',
    options: [
      {
        text: 'All five, because any change invalidates the whole run',
        correct: false,
        explain: 'Only keys that depend on C change. ingest, validate and features hash the same inputs as before.',
      },
      {
        text: 'Only train, because evaluate has no settings of its own',
        correct: false,
        explain: 'evaluate’s key hashes train’s key, so a new model gives evaluate a new key: it must score the new model.',
      },
      {
        text: 'train and evaluate; the first three come from the cache',
        correct: true,
        explain: 'C enters at train. Every step after train hashes its parent’s key, so it runs; every step before reuses its output.',
      },
    ],
  },
  {
    id: 'change-data',
    type: 'numeric',
    prompt: 'From the same last run, you switch only the data version from v1 to v2. How many of the five steps run?',
    answer: 5,
    tolerance: 0,
    hint: 'Data enters at the first step, and every later key includes the key before it.',
    explain: 'ingest’s key changes, so validate’s does, and so on down the chain: all five run.',
  },
  {
    id: 'gate',
    type: 'choice',
    prompt:
      'Production scores 0.9639. A new run scores 0.9611 and the threshold is 0.95. With the gate from this lesson, what happens?',
    options: [
      {
        text: 'Blocked: it passes the threshold but does not beat production',
        correct: true,
        explain: 'The gate has two checks. 0.9611 ≥ 0.95, but 0.9611 ≤ 0.9639, so production stays.',
      },
      {
        text: 'Registered: it is above the threshold, which is the only check',
        correct: false,
        explain: 'A threshold alone would let a worse model replace a better one. That is why the gate also compares with production.',
      },
      {
        text: 'Registered as a new version, but not given the production alias',
        correct: false,
        explain: 'Some teams do register every run, but in this lesson’s gate a blocked model is not registered at all.',
      },
    ],
  },
  {
    id: 'own-key',
    type: 'choice',
    prompt:
      'A team’s orchestrator computes each step’s cache key from that step’s own code and parameters only. What goes wrong?',
    options: [
      {
        text: 'Nothing, because a step’s output depends only on its own code and parameters',
        correct: false,
        explain: 'It also depends on its inputs. A step given new data with the same code would return an old result.',
      },
      {
        text: 'After new data arrives, train can be served a model fitted on old data',
        correct: true,
        explain: 'train’s own code and C did not change, so its key matches and the old model is reused. Keys must include the inputs’ keys or hashes.',
      },
      {
        text: 'Every step runs every time, so the cache never saves any work',
        correct: false,
        explain: 'The opposite: too few things are in the key, so the cache hits when it should not.',
      },
    ],
  },
  {
    id: 'latest-url',
    type: 'choice',
    prompt:
      'ingest downloads https://example.com/sales/latest.csv and takes no parameters. Caching is on. Tomorrow the file changes. What does the next run do?',
    options: [
      {
        text: 'Downloads the new file, since orchestrators check the URL’s contents',
        correct: false,
        explain: 'KFP hashes the step’s spec and inputs, not what a URL returns. It never looks at the remote file.',
      },
      {
        text: 'Fails, because a cached step cannot read from the network',
        correct: false,
        explain: 'Nothing fails, which is the danger: the run succeeds with yesterday’s data.',
      },
      {
        text: 'Reuses yesterday’s ingest output, because its cache key is unchanged',
        correct: true,
        explain: 'Pass a version or date (or a content hash) as a parameter, or turn caching off for that step.',
      },
    ],
  },
  {
    id: 'rollback',
    type: 'choice',
    prompt:
      'Version 7 has the production alias and is misbehaving; version 6 was fine. With an MLflow registry and servers loading models:/digits@production, how do you roll back?',
    options: [
      {
        text: 'Move the production alias to version 6 and let the servers reload',
        correct: true,
        explain: 'The alias is a pointer. set_registered_model_alias("digits", "production", 6) is the whole rollback.',
      },
      {
        text: 'Delete version 7 so the registry falls back to the newest one left',
        correct: false,
        explain: 'Aliases do not fall back, and deleting loses the evidence you need to debug version 7.',
      },
      {
        text: 'Re-run the pipeline with the settings that produced version 6',
        correct: false,
        explain: 'That makes a new version 8 (perhaps not identical), and takes as long as training. Version 6 is still there.',
      },
    ],
  },
];

export const rerunExercise: Exercise = {
  id: 'pipeline-rerun',
  prompt:
    'Write `to_rerun(parents, changed)`. `parents` maps each step to the list of steps it reads from; `changed` is the set of steps whose own code or settings changed. Return the set of steps that must run: the changed ones and everything downstream of them.',
  starter: `def to_rerun(parents, changed):
    pass`,
  hints: [
    'A step must run if it changed, or if any of its parents must run.',
    'Repeat a pass over all steps until the set stops growing, or walk children from each changed step.',
  ],
  solution: `def to_rerun(parents, changed):
    run = set(changed)
    grew = True
    while grew:
        grew = False
        for step, ps in parents.items():
            if step not in run and any(p in run for p in ps):
                run.add(step)
                grew = True
    return run`,
  explanation:
    'This is what chained cache keys compute for you: a step’s key changes when its own inputs change or when any parent’s key changes, so the cache misses exactly on this set.',
  tests: `chain = {"ingest": [], "validate": ["ingest"], "features": ["validate"], "train": ["features"], "evaluate": ["train"]}
assert to_rerun(chain, {"train"}) == {"train", "evaluate"}, 'a new C re-runs train and evaluate'
assert to_rerun(chain, {"ingest"}) == set(chain), 'new data re-runs everything'
assert to_rerun(chain, set()) == set(), 'nothing changed, nothing runs'
dag = {"ingest": [], "validate": ["ingest"], "report": ["validate"], "features": ["validate"],
       "train": ["features"], "evaluate": ["train", "features"]}
assert to_rerun(dag, {"features"}) == {"features", "train", "evaluate"}, 'report does not depend on features'
assert to_rerun(dag, {"validate"}) == {"validate", "report", "features", "train", "evaluate"}, 'both branches below validate'`,
};
