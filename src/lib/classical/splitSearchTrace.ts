import { pyRepr } from '../linalg/pyFormat';
import { formatNumber } from '../trace/values';
import { array, scalar, text } from '../trace/values';
import type { Trace, TraceStep, TraceValue } from '../types';
import { classCounts, gini } from './trees';

/**
 * The split search in plain Python, as the lesson's StepThrough shows it. `{{xs}}` and `{{feature}}`
 * are filled from the experiment; the labels are the 14 toy penguins in file order.
 */
export const SPLIT_SEARCH_SOURCE = `xs = {{xs}}  # {{feature}}
ys = ["Adelie", "Adelie", "Adelie", "Adelie", "Adelie", "Adelie",
      "Gentoo", "Gentoo", "Gentoo", "Gentoo",
      "Chinstrap", "Chinstrap", "Chinstrap", "Chinstrap"]

def gini(labels):
    n = len(labels)
    return 1 - sum((labels.count(c) / n) ** 2 for c in set(labels))

values = sorted(set(xs))
best_score, best_t = 1.0, None
for a, b in zip(values, values[1:]):
    t = (a + b) / 2
    left = [y for x, y in zip(xs, ys) if x <= t]
    right = [y for x, y in zip(xs, ys) if x > t]
    score = len(left) / len(ys) * gini(left) + len(right) / len(ys) * gini(right)
    if score < best_score:
        best_score, best_t = score, t
print(best_t, round(best_score, 4))`;

const LINE = { xs: 1, ys: 2, values: 10, init: 11, t: 13, score: 16, best: 18, print: 19 };

/** "1 penguin", "9 penguins". */
export const penguins = (n: number) => `${n} penguin${n === 1 ? '' : 's'}`;

/** Python's round(x, 4) for the values this trace prints (no exact .5 ties at 4 decimals arise here). */
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** "[6 × 'Adelie', 1 × 'Gentoo']": a list of labels, summarized by count. */
function describeLabels(counts: readonly number[], classes: readonly string[]): string {
  const parts = classes.flatMap((c, i) => (counts[i]! > 0 ? [`${counts[i]} × '${c}'`] : []));
  return `[${parts.join(', ')}]`;
}

/** "1 − ((6/7)² + (1/7)²) = 0.2449": Gini written out, skipping empty classes. */
export function giniArithmetic(counts: readonly number[]): string {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return '0 (empty)';
  const terms = counts.filter((c) => c > 0).map((c) => `(${c}/${n})²`);
  return `1 − (${terms.join(' + ')}) = ${formatNumber(gini(counts))}`;
}

/** Python's print(best_t, round(best_score, 4)) for this search. */
export function splitSearchOutput(xs: readonly number[], ys: readonly number[], k: number): string {
  const { bestT, bestScore } = runSearch(xs, ys, k, () => {});
  return `${bestT === null ? 'None' : pyRepr(bestT)} ${pyRepr(round4(bestScore))}`;
}

interface Visit {
  t: number;
  left: number[];
  right: number[];
  score: number;
  improved: boolean;
}

function runSearch(xs: readonly number[], ys: readonly number[], k: number, visit: (v: Visit) => void) {
  const values = [...new Set(xs)].sort((a, b) => a - b);
  let bestScore = 1;
  let bestT: number | null = null;
  for (let i = 0; i + 1 < values.length; i++) {
    const t = (values[i]! + values[i + 1]!) / 2;
    const left = classCounts(
      ys.filter((_, j) => xs[j]! <= t),
      k,
    );
    const right = classCounts(
      ys.filter((_, j) => xs[j]! > t),
      k,
    );
    const n = ys.length;
    const nl = left.reduce((a, b) => a + b, 0);
    const score = (nl / n) * gini(left) + ((n - nl) / n) * gini(right);
    const improved = score < bestScore;
    if (improved) {
      bestScore = score;
      bestT = t;
    }
    visit({ t, left, right, score, improved });
  }
  return { values, bestScore, bestT };
}

/**
 * A computed trace of SPLIT_SEARCH_SOURCE: the setup lines, then for each candidate threshold its
 * midpoint, the two sides, the weighted Gini, and whether it beats the best so far.
 */
export function buildSplitSearchTrace(
  xs: readonly number[],
  ys: readonly number[],
  classes: readonly string[],
): Trace {
  const k = classes.length;
  const n = ys.length;
  const values = [...new Set(xs)].sort((a, b) => a - b);
  const vars: Record<string, TraceValue> = { xs: array([...xs]) };
  const snap = () => ({ ...vars });
  const steps: TraceStep[] = [
    {
      range: { line: LINE.xs },
      vars: snap(),
      note: `xs holds the feature value of each of the ${n} penguins.`,
    },
  ];
  vars.ys = text(describeLabels(classCounts(ys, k), classes));
  steps.push({ range: { line: LINE.ys }, vars: snap(), note: `ys holds their species, in the same order.` });
  vars.values = array(values);
  steps.push({
    range: { line: LINE.values },
    vars: snap(),
    note: `${values.length} distinct values, sorted. Each neighboring pair gives one candidate threshold: ${values.length - 1} in all.`,
  });
  vars.best_score = scalar(1);
  vars.best_t = text('None');
  steps.push({
    range: { line: LINE.init },
    vars: snap(),
    note: 'Start with a worse-than-possible score, so the first candidate always becomes the best so far.',
  });
  let prev = 1;
  runSearch(xs, ys, k, ({ t, left, right, score, improved }) => {
    const nl = left.reduce((a, b) => a + b, 0);
    vars.t = scalar(t);
    steps.push({
      range: { line: LINE.t },
      vars: snap(),
      note: `Candidate t = ${formatNumber(t)}, halfway between two neighboring values.`,
    });
    vars.left = text(describeLabels(left, classes));
    vars.right = text(describeLabels(right, classes));
    vars.score = scalar(score);
    steps.push({
      range: { line: LINE.score },
      vars: snap(),
      note: `x ≤ ${formatNumber(t)} sends ${penguins(nl)} left, gini ${giniArithmetic(left)}; ${n - nl} go right, gini ${giniArithmetic(right)}. Weighted: ${nl}/${n}·${formatNumber(gini(left))} + ${n - nl}/${n}·${formatNumber(gini(right))} = ${formatNumber(score)}.`,
    });
    if (improved) {
      vars.best_score = scalar(score);
      vars.best_t = scalar(t);
      steps.push({
        range: { line: LINE.best },
        vars: snap(),
        note: `${formatNumber(score)} < ${formatNumber(prev)}, so t = ${formatNumber(t)} is the best split so far.`,
      });
      prev = score;
    }
  });
  vars.output = text(splitSearchOutput(xs, ys, k));
  steps.push({
    range: { line: LINE.print },
    vars: snap(),
    note: `Done: the threshold with the lowest weighted Gini wins. A real tree runs this search for every feature and keeps the best of all.`,
  });
  return { source: 'computed', steps };
}
