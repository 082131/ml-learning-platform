// Code for the label-errors lesson. find_issues.py is pure Python; its output for every setting was produced with
// CPython 3.13 (labelErrors.test.ts checks the browser's version against it). oof.py runs in the browser and is
// checked under CPython by content/tracks/dataops/python-outputs.test.ts. cleanlab_issues.py illustrates the
// library and is not run here.
import {
  LABEL_ERRORS_SOURCE,
  labelErrorsExperiment,
  labelErrorsSlots,
  type LabelErrorState,
} from '@/lib/dataops/labelErrors';
import type { CodeExample } from '@/lib/types';

export const le = labelErrorsExperiment('label-errors');

export const findIssuesPython: CodeExample = {
  id: 'find-issues-python',
  language: 'python',
  source: LABEL_ERRORS_SOURCE,
  slots: { method: (s) => labelErrorsSlots(s as LabelErrorState).method },
  annotations: [
    {
      id: 'items',
      range: { line: 2 },
      kind: 'variable',
      title: 'ITEMS',
      what: 'For each photo: the label in the dataset, the out-of-fold probability of “dog”, and the label an expert gave on re-review.',
      why: 'The audit itself only uses the first two. The expert label is there so the lesson can score the audit.',
    },
    {
      id: 'method',
      range: { line: 6, startCol: 10, endCol: 20 },
      match: '{{method}}',
      kind: 'parameter',
      title: 'METHOD',
      what: 'Per-class thresholds (confident learning), or one fixed cut-off, from the control.',
      why: 'The model is less sure about dogs than cats. One cut-off for both treats an unsure dog like a suspicious one.',
    },
    {
      id: 't',
      range: { line: 12 },
      kind: 'math',
      title: 't',
      what: 't[c] is the average probability the model gives class c over the items labeled c: its typical confidence for that class.',
      why: 'An item that reaches another class’s typical confidence is as convincing a member of that class as an average member.',
    },
    {
      id: 'confident',
      range: { line: 17 },
      kind: 'variable',
      title: 'confident',
      what: 'The classes whose threshold this item reaches. Often none, sometimes one, rarely both.',
      why: 'If both are reached, the more probable one wins. If it differs from the given label, the item is flagged.',
    },
    {
      id: 'fixed',
      range: { line: 22 },
      kind: 'syntax',
      title: 'fixed cut-off',
      what: 'Flag the item when the model gives its own label a probability below the cut-off.',
      why: 'Simple, but blind to how confident the model normally is per class.',
    },
    {
      id: 'sort',
      range: { line: 25 },
      kind: 'syntax',
      title: 'review order',
      what: 'Most suspicious first: the lowest probability for the label the item has.',
      why: 'Reviewers rarely get through the whole list. Ranking puts the likeliest errors at the top.',
    },
  ],
};

export const oofRunner: CodeExample = {
  id: 'oof-runner',
  language: 'python',
  run: 'pyodide',
  source: `class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


rng = LCG(3)
xs = [rng.random() for _ in range(60)]
truth = [int(x > 0.5) for x in xs]
given = list(truth)
for i in (4, 17, 33, 48):  # four labels an annotator got wrong
    given[i] = 1 - given[i]
wrong = [i for i in range(60) if given[i] != truth[i]]


def predict(train_idx, x, k=3):  # a flexible model: share of class 1 among the 3 nearest training points
    near = sorted(train_idx, key=lambda j: abs(xs[j] - x))[:k]
    return sum(given[j] for j in near) / k


everyone = list(range(60))
in_sample = [predict(everyone, xs[i], k=1) for i in everyone]  # 1-NN scored on its own training data

oof = [0.0] * 60
for f in range(5):  # 5-fold cross-validation: each item is predicted by a model that never saw it
    held_out = everyone[f::5]
    train = [i for i in everyone if i not in held_out]
    for i in held_out:
        oof[i] = predict(train, xs[i])

for name, probs in (("in-sample", in_sample), ("out-of-fold", oof)):
    caught = [i for i in wrong if (probs[i] >= 0.5) != given[i]]  # model disagrees with the wrong label
    print(f"{name:<11}: the model disagrees with {len(caught)} of {len(wrong)} wrong labels")`,
  annotations: [],
  expectedOutput: `in-sample  : the model disagrees with 0 of 4 wrong labels
out-of-fold: the model disagrees with 4 of 4 wrong labels`,
};

export const cleanlabSketch: CodeExample = {
  id: 'cleanlab-sketch',
  language: 'python',
  source: `# With scikit-learn and cleanlab (not run here)
from cleanlab.filter import find_label_issues
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict

pred_probs = cross_val_predict(  # out-of-fold: each row predicted by a model that never saw it
    LogisticRegression(max_iter=1000), X, labels, cv=5, method="predict_proba"
)
issues = find_label_issues(labels, pred_probs, return_indices_ranked_by="self_confidence")
review_queue = df.iloc[issues]  # most suspicious first; send to annotators, never auto-delete`,
  annotations: [],
};
