// Code for the weak supervision and active learning lesson. label.py is pure Python; its output for all 32
// combinations of labeling functions was produced with CPython 3.13 (programmatic.test.ts checks the browser's
// version against it). active.py runs in the browser and is checked under CPython by
// content/tracks/dataops/python-outputs.test.ts. snorkel_lf.py illustrates the library API and is not run here.
import {
  LF_SOURCE,
  programmaticExperiment,
  programmaticSlots,
  type ProgrammaticState,
} from '@/lib/dataops/programmatic';
import type { CodeExample } from '@/lib/types';

export const lf = programmaticExperiment('programmatic');

export const labelPython: CodeExample = {
  id: 'label-python',
  language: 'python',
  source: LF_SOURCE,
  slots: { active: (s) => programmaticSlots(s as ProgrammaticState).active },
  annotations: [
    {
      id: 'gold',
      range: { line: 1 },
      kind: 'variable',
      title: 'TICKETS',
      what: 'Sixteen tickets with a gold label each, checked by a person.',
      why: 'Labeling functions are written against unlabeled data, but you need a small gold set to measure how accurate each one is.',
    },
    {
      id: 'active',
      range: { line: 19, startCol: 9, endCol: 19 },
      match: '{{active}}',
      kind: 'parameter',
      title: 'ACTIVE',
      what: 'The labeling functions switched on in the controls, in a fixed order.',
      why: 'Adding a function always raises coverage or adds votes; whether it helps depends on its accuracy.',
    },
    {
      id: 'abstain',
      range: { line: 24 },
      kind: 'syntax',
      title: 'return … else ABSTAIN',
      what: 'A labeling function answers only when its rule applies, and returns ABSTAIN (None) otherwise.',
      why: 'Abstaining is what lets narrow, precise rules coexist. A rule forced to answer everywhere would be wrong most of the time.',
    },
    {
      id: 'votes',
      range: { line: 44 },
      kind: 'variable',
      title: 'votes',
      what: 'The label matrix: one row per ticket, one column per active function. The visual shows it.',
      why: 'Coverage, overlaps, conflicts and the final labels are all computed from this matrix.',
    },
    {
      id: 'fired',
      range: { line: 47 },
      kind: 'variable',
      title: 'fired',
      what: 'The tickets where function j did not abstain, with their gold labels.',
      why: 'Coverage is len(fired); accuracy is measured only where the function voted.',
    },
    {
      id: 'tie',
      range: { line: 57 },
      kind: 'syntax',
      title: 'if ones == zeros',
      what: 'No votes at all, or as many yes as no votes: the ticket stays unlabeled.',
      why: 'Guessing on a tie would add noise. These tickets are the natural queue for human annotators.',
    },
  ],
};

export const activeRunner: CodeExample = {
  id: 'active-runner',
  language: 'python',
  run: 'pyodide',
  source: `class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


TRUE_THRESHOLD = 0.6137  # unknown to us: items with score >= this are positives
BUDGET = 8  # labels we can afford


def label(x):  # asking an annotator
    return int(x >= TRUE_THRESHOLD)


def estimate(labeled):  # the model: a threshold halfway between the closest 0 and 1 seen so far
    lo = max([x for x, y in labeled if y == 0], default=0.0)
    hi = min([x for x, y in labeled if y == 1], default=1.0)
    return (lo + hi) / 2


def random_sampling(pool, rng):
    picks = []
    for _ in range(BUDGET):
        picks.append(pool[int(rng.random() * len(pool))])
    return [(x, label(x)) for x in picks]


def uncertainty_sampling(pool):
    labeled = []
    for _ in range(BUDGET):
        guess = estimate(labeled)
        x = min(pool, key=lambda p: abs(p - guess))  # the item the model is least sure about
        labeled.append((x, label(x)))
    return labeled


errors = {"random": [], "uncertainty": []}
for seed in range(1, 21):  # 20 different unlabeled pools of 1,000 items
    rng = LCG(seed)
    pool = [rng.random() for _ in range(1000)]
    errors["random"].append(abs(estimate(random_sampling(pool, rng)) - TRUE_THRESHOLD))
    errors["uncertainty"].append(abs(estimate(uncertainty_sampling(pool)) - TRUE_THRESHOLD))

for name, errs in errors.items():
    print(f"{name:<12} mean threshold error after {BUDGET} labels: {sum(errs) / len(errs):.4f}")`,
  annotations: [],
  expectedOutput: `random       mean threshold error after 8 labels: 0.0611
uncertainty  mean threshold error after 8 labels: 0.0011`,
};

export const snorkelSketch: CodeExample = {
  id: 'snorkel-sketch',
  language: 'python',
  source: `# The same idea with Snorkel (not run here): LFs vote, a label model weighs them by estimated accuracy.
from snorkel.labeling import PandasLFApplier, LFAnalysis, labeling_function
from snorkel.labeling.model import LabelModel

ABSTAIN, NOT_REFUND, REFUND = -1, 0, 1


@labeling_function()
def money_back(x):
    return REFUND if "money back" in x.text.lower() or "charged twice" in x.text.lower() else ABSTAIN


@labeling_function()
def thanks(x):
    return NOT_REFUND if "thank" in x.text.lower() else ABSTAIN


L_train = PandasLFApplier(lfs=[money_back, thanks]).apply(df=tickets)  # the label matrix
print(LFAnalysis(L=L_train, lfs=[money_back, thanks]).lf_summary())  # coverage, overlaps, conflicts

label_model = LabelModel(cardinality=2)
label_model.fit(L_train, n_epochs=500, seed=0)
probs = label_model.predict_proba(L_train)  # probabilistic labels to train the real classifier on`,
  annotations: [],
};
