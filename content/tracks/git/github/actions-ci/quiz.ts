import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'matrix-count',
    type: 'numeric',
    prompt: 'A matrix has os: [ubuntu-latest, macos-latest, windows-latest] and python: ["3.11", "3.12", "3.13"], with one exclude entry {os: windows-latest, python: "3.11"}. How many jobs run?',
    answer: 8,
    tolerance: 0,
    hint: 'Cross product first, then remove the matches.',
    explain: '3 × 3 = 9 combinations, minus the excluded one = 8.',
  },
  {
    id: 'required-check',
    type: 'choice',
    prompt: 'Your CI workflow fails on a PR, yet the merge button stays green. What is most likely missing?',
    options: [
      { text: 'The workflow needs on: pull_request to report its result', correct: false, explain: 'It ran on the PR, since it failed there. Reporting is not the problem.' },
      { text: 'The check is not marked as required in branch protection', correct: true, explain: 'GitHub shows every check, but only required ones block the merge.' },
      { text: 'Failing workflows only block merges after a second run', correct: false, explain: 'There is no retry rule. A required check that fails blocks immediately.' },
    ],
  },
  {
    id: 'fork-secrets',
    type: 'choice',
    prompt: 'A pull request from a fork runs your CI workflow (on: pull_request). What happens to steps that read secrets.API_KEY?',
    options: [
      { text: 'They get an empty value: fork PRs get no secrets', correct: true, explain: 'Otherwise anyone could open a PR that prints your secrets. Design CI so tests pass without them.' },
      { text: 'They get the secret, masked as *** in the logs', correct: false, explain: 'Masking applies to runs that do get secrets; fork PRs get none at all.' },
      { text: 'The whole workflow waits until a maintainer adds the secret', correct: false, explain: 'Maintainers may need to approve runs from first-time contributors, but secrets are still withheld.' },
    ],
  },
  {
    id: 'cache-key',
    type: 'choice',
    prompt: 'Why does setup-python’s pip cache use a hash of the requirements files in its key?',
    options: [
      { text: 'GitHub requires a hash of some file in every cache key it stores', correct: false, explain: 'Any string can be a key. The hash is a design choice.' },
      { text: 'It makes the cache smaller by compressing the file names', correct: false, explain: 'The key is a label. It does not change what is stored.' },
      { text: 'New requirements give a new key, so stale packages are not reused', correct: true, explain: 'Same inputs, same key, cache hit; new inputs, new key. The same idea as Git’s content hashes.' },
    ],
  },
  {
    id: 'order-ci',
    type: 'order',
    prompt: 'Put the steps of a CI job in order.',
    items: ['Check out the repository', 'Set up Python (with the pip cache)', 'Install dependencies', 'Lint', 'Run the tests and the smoke run'],
    explain: 'Each step needs the one before. Cheap checks (lint) come before slow ones.',
  },
];

export const matrixExercise: Exercise = {
  id: 'expand-matrix',
  prompt:
    'Write `expand_matrix(variables, exclude=(), include=())` following GitHub’s rules. `variables` is a dict of name -> list of values (the first name varies slowest). Build the cross product as dicts, drop every combination that matches all key/value pairs of some exclude entry, then for each include entry: merge it into every original combination where it does not change an original variable’s value; if it fits none, append it as a new combination. Return the list.',
  starter: `def expand_matrix(variables, exclude=(), include=()):
    pass`,
  hints: [
    'itertools.product(*variables.values()) gives the combinations in the right order; zip each with the keys.',
    'Keep a copy of each original combination. An include fits if every key it shares with the original has the same value there; added keys (from earlier includes) may be overwritten.',
  ],
  solution: `from itertools import product

def expand_matrix(variables, exclude=(), include=()):
    keys = list(variables)
    combos = [dict(zip(keys, vals)) for vals in product(*variables.values())]
    combos = [c for c in combos if not any(all(c.get(k) == v for k, v in e.items()) for e in exclude)]
    originals = [dict(c) for c in combos]
    extra = []
    for inc in include:
        fits = False
        for orig, combo in zip(originals, combos):
            if all(orig[k] == v for k, v in inc.items() if k in orig):
                combo.update(inc)
                fits = True
        if not fits:
            extra.append(dict(inc))
    return combos + extra`,
  explanation:
    'include does double duty: it adds keys to existing jobs and adds new jobs. Checking against the original combinations (not the already-extended ones) is what lets a later include overwrite a value an earlier include added.',
  tests: `r = expand_matrix(
    {"fruit": ["apple", "pear"], "animal": ["cat", "dog"]},
    include=[{"color": "green"}, {"color": "pink", "animal": "cat"}, {"fruit": "apple", "shape": "circle"},
             {"fruit": "banana"}, {"fruit": "banana", "animal": "cat"}],
)
assert r == [
    {"fruit": "apple", "animal": "cat", "color": "pink", "shape": "circle"},
    {"fruit": "apple", "animal": "dog", "color": "green", "shape": "circle"},
    {"fruit": "pear", "animal": "cat", "color": "pink"},
    {"fruit": "pear", "animal": "dog", "color": "green"},
    {"fruit": "banana"},
    {"fruit": "banana", "animal": "cat"},
], r
e = expand_matrix({"os": ["u", "w"], "py": ["3.11", "3.12"]}, exclude=[{"os": "w", "py": "3.11"}])
assert e == [{"os": "u", "py": "3.11"}, {"os": "u", "py": "3.12"}, {"os": "w", "py": "3.12"}], e`,
};
