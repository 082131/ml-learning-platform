/**
 * The label-errors lesson's experiment: 24 photos labeled cat or dog, each with an out-of-fold predicted
 * probability of "dog". Confident learning flags an item when another class reaches that class's own average
 * confidence (its per-class threshold); the alternative flags items whose given label gets less than a fixed
 * probability. An expert re-checked all 24, so the lesson can score each audit. labelErrors.test.ts checks every
 * setting against LABEL_ERRORS_SOURCE run with CPython.
 */
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

/** [given label, out-of-fold P(dog), label after expert review]; 0 = cat, 1 = dog. */
export const ITEMS: [number, number, number][] = [
  [0, 0.15, 0],
  [0, 0.1, 0],
  [0, 0.2, 0],
  [0, 0.15, 0],
  [0, 0.22, 0],
  [0, 0.12, 0],
  [0, 0.3, 0],
  [0, 0.18, 0],
  [0, 0.17, 0],
  [0, 0.38, 0],
  [0, 0.25, 0],
  [0, 0.33, 0],
  [0, 0.21, 0],
  [0, 0.52, 1],
  [0, 0.5, 1],
  [0, 0.71, 1],
  [1, 0.66, 1],
  [1, 0.48, 1],
  [1, 0.55, 1],
  [1, 0.74, 1],
  [1, 0.45, 1],
  [1, 0.61, 1],
  [1, 0.18, 0],
  [1, 0.32, 0],
];

export const METHODS = ['per-class', '0.5', '0.4', '0.3'] as const;
export type Method = (typeof METHODS)[number];
export interface LabelErrorState {
  method: Method;
}

export interface Flag {
  index: number;
  given: number;
  pDog: number;
  /** Probability the model gives to the label in the dataset: the review order sorts by it, lowest first. */
  selfConfidence: number;
  reallyWrong: boolean;
}

export interface LabelErrorResult {
  thresholds?: [number, number];
  flags: Flag[];
  knownErrors: number;
  precision: number;
  recall: number;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function perClassThresholds(): [number, number] {
  const cats = ITEMS.filter(([g]) => g === 0).map(([, p]) => 1 - p);
  const dogs = ITEMS.filter(([g]) => g === 1).map(([, p]) => p);
  return [mean(cats), mean(dogs)];
}

export function labelErrors({ method }: LabelErrorState): LabelErrorResult {
  const thresholds = method === 'per-class' ? perClassThresholds() : undefined;
  const flagged: number[] = [];
  ITEMS.forEach(([given, p], i) => {
    const probs = [1 - p, p];
    if (thresholds) {
      // The class the item "confidently" belongs to: the most probable class that reaches its own threshold.
      let best = -1;
      for (const c of [0, 1]) if (probs[c]! >= thresholds[c]! && (best < 0 || probs[c]! > probs[best]!)) best = c;
      if (best >= 0 && best !== given) flagged.push(i);
    } else if (probs[given]! < Number(method)) flagged.push(i);
  });
  const flags = flagged
    .map((index) => {
      const [given, pDog, truth] = ITEMS[index]!;
      return { index, given, pDog, selfConfidence: given ? pDog : 1 - pDog, reallyWrong: given !== truth };
    })
    .sort((a, b) => a.selfConfidence - b.selfConfidence);
  const knownErrors = ITEMS.filter(([g, , t]) => g !== t).length;
  const tp = flags.filter((f) => f.reallyWrong).length;
  return {
    thresholds,
    flags,
    knownErrors,
    precision: flags.length ? tp / flags.length : 0,
    recall: tp / knownErrors,
  };
}

const NAME = ['cat', 'dog'];

/** What LABEL_ERRORS_SOURCE prints. */
export function labelErrorsPrintout(r: LabelErrorResult): string {
  const lines: string[] = [];
  if (r.thresholds) lines.push(`thresholds: cat ${pyFixed(r.thresholds[0], 3)}, dog ${pyFixed(r.thresholds[1], 3)}`);
  for (const f of r.flags)
    lines.push(
      `item ${String(f.index).padStart(2)}: labeled ${NAME[f.given]}, P(dog)=${pyFixed(f.pDog, 2)} -> ${f.reallyWrong ? 'really wrong' : 'label was right'}`,
    );
  const tp = r.flags.filter((f) => f.reallyWrong).length;
  lines.push(
    `flagged ${r.flags.length}, really wrong ${tp}: precision ${pyFixed(r.precision, 2)}, recall ${pyFixed(r.recall, 2)} of ${r.knownErrors} known errors`,
  );
  return lines.join('\n');
}

export const LABEL_ERRORS_SOURCE = `# (given label, out-of-fold P(dog), label after expert review); 0 = cat, 1 = dog
ITEMS = [(0, 0.15, 0), (0, 0.10, 0), (0, 0.20, 0), (0, 0.15, 0), (0, 0.22, 0), (0, 0.12, 0),
         (0, 0.30, 0), (0, 0.18, 0), (0, 0.17, 0), (0, 0.38, 0), (0, 0.25, 0), (0, 0.33, 0),
         (0, 0.21, 0), (0, 0.52, 1), (0, 0.50, 1), (0, 0.71, 1), (1, 0.66, 1), (1, 0.48, 1),
         (1, 0.55, 1), (1, 0.74, 1), (1, 0.45, 1), (1, 0.61, 1), (1, 0.18, 0), (1, 0.32, 0)]
METHOD = "{{method}}"  # "per-class", or a fixed cut-off on the given label's probability
NAME = ["cat", "dog"]

flagged = []
if METHOD == "per-class":
    # t_c: the model's average probability of class c over the items labeled c
    t = [sum(1 - p for g, p, _ in ITEMS if g == 0) / sum(g == 0 for g, _, _ in ITEMS),
         sum(p for g, p, _ in ITEMS if g == 1) / sum(g == 1 for g, _, _ in ITEMS)]
    print(f"thresholds: cat {t[0]:.3f}, dog {t[1]:.3f}")
    for i, (given, p, _) in enumerate(ITEMS):
        probs = [1 - p, p]
        confident = [c for c in (0, 1) if probs[c] >= t[c]]  # classes the item reaches the threshold of
        if confident and max(confident, key=lambda c: probs[c]) != given:
            flagged.append(i)
else:
    cutoff = float(METHOD)
    flagged = [i for i, (given, p, _) in enumerate(ITEMS) if (p if given else 1 - p) < cutoff]

# review order: the lowest probability for the given label first
flagged.sort(key=lambda i: ITEMS[i][1] if ITEMS[i][0] else 1 - ITEMS[i][1])
for i in flagged:
    given, p, truth = ITEMS[i]
    print(f"item {i:2}: labeled {NAME[given]}, P(dog)={p:.2f} -> {'really wrong' if given != truth else 'label was right'}")

errors = sum(g != t for g, _, t in ITEMS)
hits = sum(ITEMS[i][0] != ITEMS[i][2] for i in flagged)
precision = hits / len(flagged) if flagged else 0
print(f"flagged {len(flagged)}, really wrong {hits}: precision {precision:.2f}, recall {hits / errors:.2f} of {errors} known errors")`;

export const labelErrorsSlots = (s: LabelErrorState) => ({ method: s.method });

export function labelErrorsExperiment(id: string): ExperimentDef<LabelErrorState, LabelErrorResult> {
  return {
    id,
    initial: { method: '0.5' },
    controls: [
      {
        kind: 'select',
        id: 'method',
        label: 'Flag an item when',
        options: [
          { value: 'per-class', label: 'another class reaches its per-class threshold' },
          { value: '0.5', label: 'its label gets P < 0.5' },
          { value: '0.4', label: 'its label gets P < 0.4' },
          { value: '0.3', label: 'its label gets P < 0.3' },
        ],
        get: (s) => s.method,
        set: (_s, v) => ({ method: v as Method }),
      },
    ],
    compute: labelErrors,
    readout: (_s, r) => [
      { label: 'Python: what find_issues.py prints', value: labelErrorsPrintout(r) },
      {
        label: 'Reviews wasted on correct labels',
        value: String(r.flags.filter((f) => !f.reallyWrong).length),
      },
    ],
  };
}
