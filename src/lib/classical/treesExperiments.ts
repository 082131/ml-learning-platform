/** Experiments for the trees-ensembles lesson: the split search, a random forest and gradient boosting. */
import { pyFixed, pyListLiteral, pyRepr } from '../linalg/pyFormat';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';
import {
  boostPredict,
  forestVotes,
  gradientBoost,
  growForest,
  majority,
  type BoostRun,
  type Forest,
} from './ensembles';
import { complete, PENGUINS, SPECIES, type Penguin, type Species } from './penguins';
import { seededRandom, shuffled } from './random';
import { buildSplitSearchTrace, splitSearchOutput } from './splitSearchTrace';
import {
  accuracy,
  bestIndex,
  growTree,
  nodesOf,
  predictTree,
  scoreSplit,
  splitScores,
  type SplitScore,
  type TreeNode,
} from './trees';

export const TREE_FEATURES = ['bill_length_mm', 'flipper_length_mm'] as const;
export type TreeFeature = (typeof TREE_FEATURES)[number];

/**
 * 14 penguins (rows of penguins.csv, 0-based): 6 Adelie, 4 Gentoo, 4 Chinstrap, drawn once with
 * numpy.random.default_rng(870) and kept because every bill and flipper length differs and the tree
 * scikit-learn grows on them doesn't depend on its random_state.
 */
export const TOY_ROWS = [12, 15, 16, 56, 96, 136, 177, 183, 250, 256, 298, 305, 311, 334] as const;
export const TOY: readonly Penguin[] = TOY_ROWS.map((r) => PENGUINS[r]!);
const cls = (s: Species) => SPECIES.indexOf(s);
const TOY_Y = TOY.map((p) => cls(p.species));
const TOY_X = TOY.map((p) => TREE_FEATURES.map((f) => p[f]!));

export const featureValues = (f: TreeFeature) => TOY.map((p) => p[f]!);
export const MAX_TREE_DEPTH = 3;

export interface SplitState {
  feature: TreeFeature;
  /** Index of the candidate threshold being tried, 0 = the lowest. */
  candidate: number;
  /** Depth of the tree drawn in the diagram. */
  depth: number;
}

export interface SplitResult {
  xs: number[];
  scores: SplitScore[];
  current: SplitScore;
  best: number;
  tree: TreeNode;
  trainAccuracy: number;
}

/** sklearn.tree.export_text for our tree: thresholds as float32 printed with 2 decimals, as scikit-learn does. */
export function exportText(tree: TreeNode, features: readonly string[], classes: readonly string[]): string {
  const lines: string[] = [];
  const walk = (node: TreeNode, depth: number) => {
    const pad = '|   '.repeat(depth);
    if (!node.split) {
      lines.push(`${pad}|--- class: ${classes[node.prediction]}`);
      return;
    }
    const name = features[node.split.feature];
    const t = pyFixed(Math.fround(node.split.threshold), 2);
    lines.push(`${pad}|--- ${name} <= ${t}`);
    walk(node.left!, depth + 1);
    lines.push(`${pad}|--- ${name} >  ${t}`);
    walk(node.right!, depth + 1);
  };
  walk(tree, 0);
  return lines.join('\n');
}

export function computeSplit(s: SplitState): SplitResult {
  const xs = featureValues(s.feature);
  const scores = splitScores(xs, TOY_Y, SPECIES.length);
  const i = Math.min(s.candidate, scores.length - 1);
  const tree = growTree(TOY_X, TOY_Y, SPECIES.length, { maxDepth: s.depth });
  return {
    xs,
    scores,
    current: scoreSplit(xs, TOY_Y, SPECIES.length, scores[i]!.threshold),
    best: bestIndex(scores),
    tree,
    trainAccuracy: accuracy(
      TOY_X.map((x) => predictTree(tree, x)),
      TOY_Y,
    ),
  };
}

/** Number literal as Python source writes it: 39.0 in the CSV is written 39, as pandas' tolist() of ints would. */
const literal = (xs: readonly number[]) => pyListLiteral(xs);

export const SPLIT_TRACE_EXAMPLE = 'tree-split-search';

export function splitExperiment(id: string): ExperimentDef<SplitState, SplitResult> {
  const nCandidates = TOY.length - 1;
  return {
    id,
    initial: { feature: 'bill_length_mm', candidate: 3, depth: 2 },
    controls: [
      {
        kind: 'select',
        id: 'feature',
        label: 'Feature to split on',
        options: TREE_FEATURES.map((f) => ({ value: f, label: f })),
        get: (s) => s.feature,
        set: (s, v) => ({ ...s, feature: v as TreeFeature }),
      },
      {
        kind: 'slider',
        id: 'candidate',
        label: 'Candidate threshold',
        min: 0,
        max: nCandidates - 1,
        get: (s) => s.candidate,
        set: (s, candidate) => ({ ...s, candidate }),
        format: (v) => `${v + 1} of ${nCandidates}`,
      },
      {
        kind: 'slider',
        id: 'depth',
        label: 'Tree depth (max_depth)',
        min: 1,
        max: MAX_TREE_DEPTH,
        get: (s) => s.depth,
        set: (s, depth) => ({ ...s, depth }),
      },
    ],
    compute: computeSplit,
    trace: (s) => buildSplitSearchTrace(featureValues(s.feature), TOY_Y, SPECIES),
    traceExample: SPLIT_TRACE_EXAMPLE,
    readout: (s, r) => {
      const c = r.current;
      const nl = c.left.reduce((a, b) => a + b, 0);
      const n = TOY.length;
      const best = r.scores[r.best]!;
      return [
        {
          label: 'Tried split',
          value: `${s.feature} ≤ ${formatNumber(c.threshold)}: weighted Gini ${nl}/${n}·${formatNumber(c.giniLeft)} + ${n - nl}/${n}·${formatNumber(c.giniRight)} = ${formatNumber(c.weighted)}`,
        },
        {
          label: `Best split on ${s.feature}`,
          value: `${s.feature} ≤ ${formatNumber(best.threshold)} (weighted Gini ${formatNumber(best.weighted)})`,
        },
        { label: 'split_search.py prints', value: splitSearchOutput(r.xs, TOY_Y, SPECIES.length) },
        { label: 'tree.py prints', value: exportText(r.tree, TREE_FEATURES, SPECIES) },
        {
          label: `Tree with max_depth=${s.depth}`,
          value: `${nodesOf(r.tree).filter((x) => !x.split).length} leaves, ${Math.round(r.trainAccuracy * n)}/${n} training penguins right`,
        },
      ];
    },
  };
}

/**
 * The toy penguins as a Python list of [bill_length_mm, flipper_length_mm] rows, one source line per
 * species block (Adelie, Gentoo, Chinstrap), the continuation lines indented to sit under the first.
 */
export function toyXLiteral(): string {
  const pair = (p: Penguin) => pyListLiteral(TREE_FEATURES.map((f) => p[f]!));
  const blocks = [TOY.slice(0, 6), TOY.slice(6, 10), TOY.slice(10)].map((b) => b.map(pair).join(', '));
  return `[${blocks.join(',\n     ')}]`;
}

/** Slot values for code that inlines the toy penguins. */
export const splitSlots = {
  xs: (s: SplitState) => literal(featureValues(s.feature)),
  feature: (s: SplitState) => s.feature,
  depth: (s: SplitState) => String(s.depth),
  exportText: (s: SplitState) => exportText(computeSplit(s).tree, TREE_FEATURES, SPECIES),
};

// ---------------------------------------------------------------- random forest

/** Complete rows (both features known), shuffled once with seed 0 and split 70 % / 30 %. */
const FOREST_ROWS = shuffled(complete(PENGUINS, [...TREE_FEATURES]), seededRandom(0));
const N_TRAIN = Math.round(FOREST_ROWS.length * 0.7);
export const FOREST_TRAIN = FOREST_ROWS.slice(0, N_TRAIN);
export const FOREST_TEST = FOREST_ROWS.slice(N_TRAIN);
const xy = (rows: readonly Penguin[]) => ({
  X: rows.map((p) => TREE_FEATURES.map((f) => p[f]!)),
  y: rows.map((p) => cls(p.species)),
});
const TRAIN = xy(FOREST_TRAIN);
const TEST = xy(FOREST_TEST);
export const MAX_TREES = 50;
/** With 2 features, scikit-learn's max_features="sqrt" tries int(√2) = 1 feature per split. */
export const FOREST_MAX_FEATURES = 1;

/** The single tree the forest is compared with: fully grown on all training rows, every feature at every split. */
const SINGLE_TREE = growTree(TRAIN.X, TRAIN.y, SPECIES.length);
const SINGLE_PRED = TEST.X.map((x) => predictTree(SINGLE_TREE, x));

const forestCache = new Map<number, { forest: Forest; votes: number[][][] }>();
/** The 50-tree forest for a seed, with each test row's running vote counts after 1..50 trees (memoized). */
function forestFor(seed: number) {
  let hit = forestCache.get(seed);
  if (!hit) {
    const forest = growForest(TRAIN.X, TRAIN.y, SPECIES.length, MAX_TREES, seed, FOREST_MAX_FEATURES);
    const votes = TEST.X.map((x) => {
      const preds = forest.trees.map((t) => predictTree(t, x));
      const running: number[][] = [];
      const counts = SPECIES.map(() => 0);
      for (const p of preds) {
        counts[p]! += 1;
        running.push([...counts]);
      }
      return running;
    });
    hit = { forest, votes };
    forestCache.set(seed, hit);
  }
  return hit;
}

export interface ForestState {
  trees: number;
  seed: number;
  /** Index into FOREST_TEST of the penguin whose vote is shown. */
  penguin: number;
}

export interface ForestResult {
  penguin: Penguin;
  votes: number[];
  forestPrediction: number;
  treePrediction: number;
  forestAccuracy: number;
  treeAccuracy: number;
  /** Test accuracy of the forest after 1..MAX_TREES trees. */
  curve: number[];
  /** Distinct training rows in tree 1's bootstrap sample. */
  distinctInFirstSample: number;
  forest: Forest;
}

export function computeForest(s: ForestState): ForestResult {
  const { forest, votes } = forestFor(s.seed);
  const accAfter = (m: number) =>
    accuracy(
      votes.map((v) => majority(v[m - 1]!)),
      TEST.y,
    );
  const v = votes[s.penguin]![s.trees - 1]!;
  return {
    penguin: FOREST_TEST[s.penguin]!,
    votes: v,
    forestPrediction: majority(v),
    treePrediction: SINGLE_PRED[s.penguin]!,
    forestAccuracy: accAfter(s.trees),
    treeAccuracy: accuracy(SINGLE_PRED, TEST.y),
    curve: Array.from({ length: MAX_TREES }, (_, i) => accAfter(i + 1)),
    distinctInFirstSample: new Set(forest.samples[0]).size,
    forest,
  };
}

/** Same check as forestVotes, exposed so tests can compare the cached running counts. */
export const votesFromScratch = (s: ForestState) =>
  forestVotes(forestFor(s.seed).forest, TEST.X[s.penguin]!, SPECIES.length, s.trees);

const pct = (x: number, n: number) =>
  `${Math.round(x * n)}/${n} = ${formatNumber(Math.round(x * 1000) / 10)} %`;

export function forestExperiment(
  id: string,
  initial: Partial<ForestState> = {},
): ExperimentDef<ForestState, ForestResult> {
  return {
    id,
    initial: { trees: 25, seed: 1, penguin: 0, ...initial },
    controls: [
      {
        kind: 'slider',
        id: 'trees',
        label: 'Number of trees',
        min: 1,
        max: MAX_TREES,
        get: (s) => s.trees,
        set: (s, trees) => ({ ...s, trees }),
      },
      {
        kind: 'slider',
        id: 'seed',
        label: 'Random seed',
        min: 0,
        max: 20,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed }),
      },
      {
        kind: 'slider',
        id: 'penguin',
        label: 'Held-out penguin',
        min: 0,
        max: FOREST_TEST.length - 1,
        get: (s) => s.penguin,
        set: (s, penguin) => ({ ...s, penguin }),
        format: (v) => `row ${FOREST_TEST[v]!.row}`,
      },
    ],
    compute: computeForest,
    readout: (s, r) => {
      const n = FOREST_TEST.length;
      return [
        {
          label: `Votes for row ${r.penguin.row} (${r.penguin.species})`,
          value: SPECIES.map((sp, i) => `${sp} ${r.votes[i]}`).join(', '),
        },
        { label: `Forest of ${s.trees} trees says`, value: SPECIES[r.forestPrediction]! },
        { label: 'Single tree says', value: SPECIES[r.treePrediction]! },
        { label: 'Forest accuracy on held-out rows', value: pct(r.forestAccuracy, n) },
        { label: 'Single tree accuracy on held-out rows', value: pct(r.treeAccuracy, n) },
      ];
    },
  };
}

// ---------------------------------------------------------------- gradient boosting

export const BOOST_X = TOY.map((p) => p.flipper_length_mm!);
export const BOOST_Y = TOY.map((p) => p.body_mass_g!);
export const MAX_STAGES = 30;
/** Learning rates whose stages were checked against scikit-learn (fixtures/trees.json). */
export const LEARNING_RATES = ['0.1', '0.3', '1.0'] as const;

export interface BoostState {
  learningRate: (typeof LEARNING_RATES)[number];
  stages: number;
}

export interface BoostResult {
  run: BoostRun;
  lr: number;
}

const boostCache = new Map<string, BoostRun>();
export function computeBoost(s: BoostState): BoostResult {
  let run = boostCache.get(s.learningRate);
  if (!run) {
    run = gradientBoost(BOOST_X, BOOST_Y, Number(s.learningRate), MAX_STAGES);
    boostCache.set(s.learningRate, run);
  }
  return { run, lr: Number(s.learningRate) };
}

/** What `print(round(mean_squared_error(y, model.predict(X)), 1))` prints after `stages` stages. */
export const boostPrintedMse = (r: BoostResult, stages: number) =>
  pyRepr(Math.round(r.run.mse[stages]! * 10) / 10);

export const boostSlots = {
  X: () => `[${BOOST_X.map((x) => `[${x}]`).join(', ')}]`,
  y: () => pyListLiteral(BOOST_Y),
  stages: (s: BoostState) => String(s.stages),
  lr: (s: BoostState) => s.learningRate,
};

export function boostExperiment(id: string): ExperimentDef<BoostState, BoostResult> {
  return {
    id,
    initial: { learningRate: '0.3', stages: 3 },
    controls: [
      {
        kind: 'select',
        id: 'lr',
        label: 'Learning rate',
        options: LEARNING_RATES.map((v) => ({ value: v, label: v })),
        get: (s) => s.learningRate,
        set: (s, v) => ({ ...s, learningRate: v as BoostState['learningRate'] }),
      },
      {
        kind: 'slider',
        id: 'stages',
        label: 'Stages (n_estimators)',
        min: 1,
        max: MAX_STAGES,
        get: (s) => s.stages,
        set: (s, stages) => ({ ...s, stages }),
      },
    ],
    compute: computeBoost,
    readout: (s, r) => {
      const st = r.run.stages[s.stages - 1]!;
      return [
        { label: 'Start F₀ = mean(y)', value: `${formatNumber(r.run.init)} g` },
        {
          label: `Stage ${s.stages} stump`,
          value: `flipper ≤ ${formatNumber(st.stump.threshold)} → ${formatNumber(st.stump.left)}, else ${formatNumber(st.stump.right)}`,
        },
        { label: 'print(round(mse, 1))', value: boostPrintedMse(r, s.stages) },
        {
          label: 'Prediction for row 305 (205 mm)',
          value: `${formatNumber(boostPredict(r.run, r.lr, s.stages, 205))} g (actual 4550 g)`,
        },
      ];
    },
  };
}
