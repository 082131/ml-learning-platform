// Code for "READMEs, docstrings and API documentation". The doctest runner reuses the Google-style docstring shown
// in the docstring view (DOC_EXAMPLES.google), so python-outputs.test.ts checks under CPython that the example in
// that docstring is true. The docstring parser is unit-tested in libs.test.ts.
import { DOC_EXAMPLES, docstringExperiment } from '@/lib/git/experiments';
import { readmeExperiment } from '@/lib/git/docsKinds';
import type { CodeExample } from '@/lib/types';

export const docstrings = docstringExperiment('git-docstrings');
export const readme = readmeExperiment('git-readme');

const googleSplit = DOC_EXAMPLES.google!.source;

export const doctestRunner: CodeExample = {
  id: 'doctest-split',
  language: 'python',
  run: 'pyodide',
  source: `import doctest
import inspect
import random


${googleSplit}
    if not 0 < test_size < 1:
        raise ValueError(f"test_size must be between 0 and 1, got {test_size}")
    shuffled = list(rows)
    random.Random(seed).shuffle(shuffled)
    n_test = round(len(shuffled) * test_size)
    return shuffled[: len(shuffled) - n_test], shuffled[len(shuffled) - n_test :]


# Run every >>> example in this module's docstrings and compare the output.
print(doctest.testmod())
print(inspect.signature(split), "-", inspect.getdoc(split).splitlines()[0])`,
  annotations: [
    {
      id: 'example',
      range: { line: 23 },
      kind: 'syntax',
      title: '>>> example',
      what: 'An interactive session: the call, then the exact output Python prints.',
      why: 'doctest runs it. If someone changes split() and forgets the docstring, the example fails and so does CI.',
    },
    {
      id: 'testmod',
      range: { line: 35 },
      kind: 'function',
      title: 'doctest.testmod()',
      what: 'Finds and runs the examples in the module’s docstrings; returns the failure and attempt counts.',
      why: 'In a project, run pytest --doctest-modules instead, so doctests run with the rest of the test suite.',
    },
    {
      id: 'help',
      range: { line: 36 },
      kind: 'function',
      title: 'inspect.getdoc()',
      what: 'Reads the docstring at run time, as help(), IDEs and documentation generators do.',
      why: 'The docstring is the documentation people actually see, at the moment they call the function.',
    },
  ],
  expectedOutput: `TestResults(failed=0, attempted=1)
(rows, test_size=0.2, seed=0) - Split rows into a shuffled train set and test set.`,
};

export const readmeMd: CodeExample = {
  id: 'readme-md',
  language: 'markdown',
  source: `# churn-model

Predicts which customers will cancel in the next 30 days, from usage and billing data.

[![CI](https://github.com/ada/churn-model/actions/workflows/ci.yml/badge.svg)](https://github.com/ada/churn-model/actions/workflows/ci.yml)

## Quick start
\`\`\`bash
pip install -e ".[dev]"
churn-train --config params.yaml          # about 2 minutes on a laptop
churn-predict --model models/churn.pkl --input customers.csv > scores.csv
\`\`\`

## Model
Gradient-boosted trees; ROC AUC 0.87 on the March 2026 holdout.
Data, metrics by segment and known limits: [MODEL_CARD.md](MODEL_CARD.md).

## Contributing
Run \`pre-commit install\` and \`pytest\` before pushing. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
Apache-2.0`,
  annotations: [
    {
      id: 'one-line',
      range: { line: 3 },
      kind: 'syntax',
      title: 'One sentence',
      what: 'What the project does, for whom, from what.',
      why: 'Most visitors read only this line and decide whether to keep reading.',
    },
    {
      id: 'quickstart',
      range: { line: 8 },
      kind: 'syntax',
      title: 'Quick start',
      what: 'Copy-paste commands that work on a fresh clone.',
      why: 'Test them in CI or a clean container: a README whose first command fails loses the reader.',
    },
  ],
};

export const modelCard: CodeExample = {
  id: 'model-card',
  language: 'markdown',
  source: `# Model card: churn-classifier 1.3.0

## Intended use
Rank existing consumer customers by 30-day churn risk for retention calls.
**Not for:** credit, pricing or any decision about an individual without human review.

## Training data
Customer snapshot 2026-03-01 (184,220 customers, DVC md5 6555a9b6...). Business customers excluded.

## Evaluation
| segment | ROC AUC | recall at top 5% |
| ------- | ------- | ---------------- |
| all     | 0.871   | 0.41             |
| tenure < 3 months | 0.792 | 0.33     |

## Limitations and risks
Weaker for new customers (little history). Scores drift when pricing changes: retrain after each price change.

## Lineage
Code v1.3.0 (commit 85665b2...), parameters in params.yaml, metrics logged in run 7f3a.`,
  annotations: [
    {
      id: 'not-for',
      range: { line: 5 },
      kind: 'syntax',
      title: 'Out-of-scope uses',
      what: 'Uses the model was not built or evaluated for.',
      why: 'A model card’s most valuable line: it stops a reasonable-looking misuse before it happens.',
    },
    {
      id: 'segments',
      range: { line: 13 },
      kind: 'syntax',
      title: 'Metrics by segment',
      what: 'Performance for groups where the model behaves differently.',
      why: 'One overall number hides where the model fails.',
    },
  ],
};

export const pydoclintToml: CodeExample = {
  id: 'docs-lint',
  language: 'toml',
  source: `# pyproject.toml: check docstrings in CI with ruff (pydocstyle rules) and pydoclint
[tool.ruff.lint]
extend-select = ["D"]               # missing or badly formatted docstrings
[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.pydoclint]
style = "google"
arg-type-hints-in-docstring = false # types live in the signature's annotations
check-return-types = false

[tool.pytest.ini_options]
addopts = "--doctest-modules"       # run >>> examples with the tests`,
  annotations: [
    {
      id: 'pydoclint',
      range: { line: 7 },
      kind: 'framework',
      title: 'pydoclint',
      what: 'Compares each docstring’s documented arguments, returns and raises with the function’s signature.',
      why: 'Catches the stale docstring: a renamed parameter that the docs still describe.',
    },
  ],
};
