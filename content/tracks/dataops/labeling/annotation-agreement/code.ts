// Code for the annotation-agreement lesson. kappa.py is pure Python; its output for every setting was produced
// with CPython 3.13 (agreement.test.ts checks the browser's version against it). consolidate.py runs in the
// browser and is checked under CPython by content/tracks/dataops/python-outputs.test.ts.
import {
  AGREEMENT_SOURCE,
  agreementExperiment,
  agreementSlots,
  type AgreementState,
} from '@/lib/dataops/agreement';
import type { CodeExample } from '@/lib/types';

export const ag = agreementExperiment('agreement');

const st = (s: unknown) => s as AgreementState;

export const kappaPython: CodeExample = {
  id: 'kappa-python',
  language: 'python',
  source: AGREEMENT_SOURCE,
  slots: {
    a: (s) => agreementSlots(st(s)).a,
    b: (s) => agreementSlots(st(s)).b,
  },
  annotations: [
    {
      id: 'a',
      range: { line: 1, startCol: 4, endCol: 9 },
      match: '{{a}}',
      kind: 'variable',
      title: 'A',
      what: 'Annotator A’s labels for the comments shown in the visual, in order.',
      why: 'Agreement is always computed on the same items labeled independently by both people.',
    },
    {
      id: 'b',
      range: { line: 2, startCol: 4, endCol: 9 },
      match: '{{b}}',
      kind: 'variable',
      title: 'B',
      what: 'Annotator B’s labels. With the lazy annotator, every value is 0.',
      why: 'A constant labeler can still agree often when one class dominates. Kappa is built to expose that.',
    },
    {
      id: 'po',
      range: { line: 7 },
      kind: 'math',
      title: 'p_o',
      what: 'Observed agreement: the share of comments where both gave the same label.',
      why: 'Easy to read, but it rewards agreeing on the majority class, which takes no skill when that class is common.',
    },
    {
      id: 'pe',
      range: { line: 10 },
      kind: 'math',
      title: 'p_e',
      what: 'Chance agreement: both say toxic (p_a · p_b) plus both say fine ((1 − p_a)(1 − p_b)), if each labeled at random at their own rate.',
      why: 'This is the agreement you would get for free. The rarer one class is, the higher p_e.',
    },
    {
      id: 'kappa',
      range: { line: 11 },
      kind: 'math',
      title: 'kappa',
      what: 'How much of the possible improvement over chance (1 − p_e) the annotators actually achieved (p_o − p_e).',
      why: '0 means no better than chance, 1 means perfect. A lazy annotator gets exactly 0 because p_o equals p_e.',
    },
  ],
};

export const consolidateRunner: CodeExample = {
  id: 'consolidate-runner',
  language: 'python',
  run: 'pyodide',
  source: `from itertools import combinations

# 12 comments labeled by three annotators (1 = toxic). Items 0-3 are gold questions with known answers.
GOLD = {0: 1, 1: 0, 2: 1, 3: 0}
labels = {
    "ana":  [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0],
    "ben":  [1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0],
    "chen": [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],  # clicks "toxic" almost every time
}


def kappa(a, b):
    n = len(a)
    p_o = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    p_e = pa * pb + (1 - pa) * (1 - pb)
    return (p_o - p_e) / (1 - p_e)


gold_acc = {n: sum(labs[i] == a for i, a in GOLD.items()) / len(GOLD) for n, labs in labels.items()}
for name in labels:
    print(f"{name:<5} gold accuracy {gold_acc[name]:.2f}")
for x, y in combinations(labels, 2):
    print(f"kappa({x}, {y}) = {kappa(labels[x], labels[y]):.2f}")

trusted = [n for n in labels if gold_acc[n] >= 0.75]  # drop annotators who fail the gold questions
print("trusted:", trusted)
for item in range(len(GOLD), 12):
    votes = [labels[n][item] for n in trusted]
    if len(set(votes)) == 1:
        print(f"item {item:2}: label {votes[0]}")
    else:
        print(f"item {item:2}: trusted annotators disagree -> adjudicate")`,
  annotations: [],
  expectedOutput: `ana   gold accuracy 1.00
ben   gold accuracy 1.00
chen  gold accuracy 0.50
kappa(ana, ben) = 0.67
kappa(ana, chen) = 0.17
kappa(ben, chen) = 0.17
trusted: ['ana', 'ben']
item  4: label 1
item  5: label 0
item  6: trusted annotators disagree -> adjudicate
item  7: label 1
item  8: trusted annotators disagree -> adjudicate
item  9: label 0
item 10: label 1
item 11: label 0`,
};

export const guidelineV2: CodeExample = {
  id: 'guideline-v2',
  language: 'json',
  source: `{
  "task": "comment-toxicity",
  "guideline_version": "2.0",
  "labels": {
    "toxic": "An insult, threat or slur aimed at a person or group, including sarcastic insults.",
    "fine": "Everything else, including criticism of ideas or products."
  },
  "edge_cases": [
    { "rule": "Profanity with no target is fine.", "example": "This damn printer jammed again." },
    { "rule": "A sarcastic insult at a person is toxic.", "example": "Great job, genius, you broke it again." },
    { "rule": "Quoting an insult to report it is fine.", "example": "He called me a \\"moron\\" in the meeting." }
  ],
  "gold_questions_per_100": 5,
  "annotators_per_item": 3,
  "consolidation": "unanimous vote among annotators with >= 75% gold accuracy, else adjudicate"
}`,
  annotations: [],
};
