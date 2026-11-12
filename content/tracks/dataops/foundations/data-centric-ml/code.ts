// Code for the data-centric ML lesson. knn.py is pure Python; its output for every setting was produced with
// CPython 3.13 (dataCentric.test.ts checks the browser's version against it). audit.py runs in the browser and
// is checked under CPython by content/tracks/dataops/python-outputs.test.ts.
import {
  DATA_CENTRIC_SOURCE,
  dataCentricExperiment,
  dataCentricSlots,
  type DataCentricState,
} from '@/lib/dataops/dataCentric';
import type { CodeExample } from '@/lib/types';

export const dc = dataCentricExperiment('data-centric');

const st = (s: unknown) => s as DataCentricState;

export const knnPython: CodeExample = {
  id: 'knn-python',
  language: 'python',
  source: DATA_CENTRIC_SOURCE,
  slots: {
    n: (s) => dataCentricSlots(st(s)).n,
    noise: (s) => dataCentricSlots(st(s)).noise,
    k: (s) => dataCentricSlots(st(s)).k,
  },
  annotations: [
    {
      id: 'lcg',
      range: { line: 1 },
      kind: 'function',
      title: 'class LCG',
      what: 'A tiny seeded random number generator written out in full.',
      why: 'Python and the browser run the same arithmetic, so the page can show exactly what this file prints for every setting.',
    },
    {
      id: 'label-rule',
      range: { line: 15 },
      kind: 'math',
      title: 'The true label',
      what: 'Class 1 means the point lies inside a circle of radius 0.3 around (0.5, 0.5): (x − 0.5)² + (y − 0.5)² < 0.09.',
      why: 'Because the true rule is known, we can measure exactly how much damage wrong labels do.',
    },
    {
      id: 'n',
      range: { line: 20, startCol: 10, endCol: 15 },
      match: '{{n}}',
      kind: 'parameter',
      title: 'N_TRAIN',
      what: 'How many training examples, from the control.',
      why: 'The "collect more data" fix. Larger sizes keep the smaller set and add to it, so cells are comparable.',
    },
    {
      id: 'noise',
      range: { line: 21, startCol: 8, endCol: 17 },
      match: '{{noise}}',
      kind: 'parameter',
      title: 'NOISE',
      what: 'The chance that an annotator gave a training example the wrong class, from the control.',
      why: 'The "clean the labels" fix lowers this number. The realised share differs a little from NOISE, because each flip is random.',
    },
    {
      id: 'k',
      range: { line: 22, startCol: 4, endCol: 9 },
      match: '{{k}}',
      kind: 'parameter',
      title: 'K',
      what: 'How many nearest training examples vote on each prediction.',
      why: 'The "change the model" fix: more voters outvote an isolated wrong label.',
    },
    {
      id: 'train',
      range: { line: 24 },
      kind: 'variable',
      title: 'train',
      what: 'The training set with some labels flipped: 1 - lab turns 0 into 1 and 1 into 0.',
      why: 'This is symmetric label noise, the simplest kind. Real annotators make class-specific mistakes, which the label-errors lesson handles.',
    },
    {
      id: 'test',
      range: { line: 26 },
      kind: 'variable',
      title: 'test',
      what: '400 new points with correct labels.',
      why: 'A clean test set measures how good the model really is. With a noisy test set you could not tell a better model from a luckier one.',
    },
    {
      id: 'predict',
      range: { line: 30 },
      kind: 'function',
      title: 'nearest',
      what: 'Sorts every training example by squared distance to (x, y) and keeps the K closest.',
      why: 'Squared distance ranks points the same way as distance and avoids a square root.',
    },
  ],
};

export const auditRunner: CodeExample = {
  id: 'audit-runner',
  language: 'python',
  run: 'pyodide',
  source: `class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def make_points(count, seed):
    rng = LCG(seed)
    points = []
    for _ in range(count):
        x, y = rng.random(), rng.random()
        points.append((x, y, int((x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.09), rng.random()))
    return points


def accuracy(train, test, k=1):
    hits = 0
    for x, y, lab in test:
        near = sorted(train, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[:k]
        hits += int(2 * sum(p[2] for p in near) > k) == lab
    return hits / len(test)


raw = make_points(400, seed=7)
train = [(x, y, 1 - lab if u < 0.3 else lab) for x, y, lab, u in raw]  # 30% noisy labels
truth = [lab for _, _, lab, _ in raw]
test = [(x, y, lab) for x, y, lab, _ in make_points(400, seed=99)]

# Audit: flag a training label when most of its 10 nearest neighbours disagree with it
flagged = []
for i, (x, y, lab) in enumerate(train):
    near = sorted((p for j, p in enumerate(train) if j != i),
                  key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[:10]
    if sum(p[2] != lab for p in near) >= 7:
        flagged.append(i)

really_wrong = sum(train[i][2] != truth[i] for i in flagged)
all_wrong = sum(t[2] != truth[i] for i, t in enumerate(train))
print(f"wrong labels in training set: {all_wrong} of {len(train)}")
print(f"flagged for review: {len(flagged)}, of which really wrong: {really_wrong}")

# A reviewer checks each flagged label and corrects it (here we can look up the truth)
fixed = [(x, y, truth[i]) if i in flagged else (x, y, lab) for i, (x, y, lab) in enumerate(train)]
print(f"1-NN test accuracy before review: {accuracy(train, test):.3f}")
print(f"1-NN test accuracy after review:  {accuracy(fixed, test):.3f}")`,
  annotations: [],
  expectedOutput: `wrong labels in training set: 134 of 400
flagged for review: 76, of which really wrong: 73
1-NN test accuracy before review: 0.630
1-NN test accuracy after review:  0.848`,
};
