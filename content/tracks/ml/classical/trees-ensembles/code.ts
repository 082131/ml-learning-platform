// Code for the trees-ensembles lesson. Every output below was produced by running the code with
// CPython 3.13, NumPy 2.4.6, pandas 3.0.2 and scikit-learn 1.8.0 (the versions Pyodide 314.0.7 ships).
// The split search, export_text and the boosting MSE are also checked against those runs in
// src/lib/classical/*.test.ts. The forest example reads penguins.csv, so it can't run in the browser.
import { SPLIT_SEARCH_SOURCE } from '@/lib/classical/splitSearchTrace';
import {
  boostExperiment,
  boostSlots,
  forestExperiment,
  SPLIT_TRACE_EXAMPLE,
  splitExperiment,
  splitSlots,
  toyXLiteral,
  type BoostState,
  type SplitState,
} from '@/lib/classical/treesExperiments';
import type { CodeExample } from '@/lib/types';

/** The split search: scatter, Gini chart, tree diagram, both code blocks, trace and readout share it. */
export const splitExp = splitExperiment('tree-split');
/** Penguin 4 of the held-out rows is row 191, a Gentoo the single tree gets wrong. */
export const forestExp = forestExperiment('tree-forest', { penguin: 4 });
export const boostExp = boostExperiment('tree-boost');

const sp = (s: unknown) => s as SplitState;
const bs = (s: unknown) => s as BoostState;

export const splitSearch: CodeExample = {
  id: SPLIT_TRACE_EXAMPLE,
  language: 'python',
  source: SPLIT_SEARCH_SOURCE,
  slots: { xs: (s) => splitSlots.xs(sp(s)), feature: (s) => splitSlots.feature(sp(s)) },
  annotations: [
    {
      id: 'xs',
      range: { line: 1, startCol: 5, endCol: 11 },
      match: '{{xs}}',
      kind: 'parameter',
      title: 'The feature values',
      what: 'The chosen feature for each of the 14 penguins, in file order. Filled from the experiment’s feature menu.',
      why: 'The search only looks at one feature at a time. A tree runs it once per feature and keeps the best.',
      output: 'A list of 14 numbers',
    },
    {
      id: 'p',
      range: { line: 8, startCol: 20, endCol: 39 },
      match: 'labels.count(c) / n',
      kind: 'math',
      title: 'pₖ = countₖ / n',
      what: 'The fraction of the node that belongs to class c.',
      why: 'Gini is defined on these fractions, so a node of 4 and one of 400 with the same mix score the same.',
    },
    {
      id: 'square',
      range: { line: 8, startCol: 41, endCol: 45 },
      match: '** 2',
      kind: 'math',
      title: 'pₖ²',
      what: 'Squares each fraction; their sum is the chance that two random picks from the node have the same class.',
      why: '1 minus that chance is the chance they differ: the Gini impurity.',
    },
    {
      id: 'sorted',
      range: { line: 10, startCol: 9, endCol: 24 },
      match: 'sorted(set(xs))',
      kind: 'function',
      title: 'sorted(set(xs))',
      what: 'The distinct values in increasing order.',
      why: 'Only thresholds between two neighboring values change which penguins go left, so these are the only ones worth trying.',
    },
    {
      id: 'pairs',
      range: { line: 12, startCol: 12, endCol: 35 },
      match: 'zip(values, values[1:])',
      kind: 'function',
      title: 'zip(values, values[1:])',
      what: 'Pairs each value with the next one: (v0, v1), (v1, v2), …',
      why: 'Each neighboring pair gives one candidate threshold, so 14 distinct values give 13 candidates.',
    },
    {
      id: 'mid',
      range: { line: 13, startCol: 8, endCol: 19 },
      match: '(a + b) / 2',
      kind: 'math',
      title: 'The midpoint',
      what: 'The threshold halfway between two neighboring values, as scikit-learn chooses it.',
      why: 'Any threshold between a and b splits the training rows the same way; the midpoint leaves room on both sides for new data.',
    },
    {
      id: 'le',
      range: { line: 14, startCol: 41, endCol: 47 },
      match: 'x <= t',
      kind: 'syntax',
      title: 'x <= t goes left',
      what: 'Penguins at or below the threshold go to the left child, the rest to the right.',
      why: 'scikit-learn uses the same convention, so “≤ 41.95” in export_text means “yes, go left”.',
    },
    {
      id: 'weight',
      range: { line: 16, startCol: 12, endCol: 44 },
      match: 'len(left) / len(ys) * gini(left)',
      kind: 'math',
      title: 'Weighted by size',
      what: 'The left side’s Gini counts in proportion to how many penguins it holds.',
      why: 'Without the weights, splitting off a single pure penguin would look great even though it barely helps.',
    },
    {
      id: 'strict',
      range: { line: 17, startCol: 7, endCol: 25 },
      match: 'score < best_score',
      kind: 'syntax',
      title: 'Strictly better',
      what: 'A candidate only replaces the best if its score is lower, not equal.',
      why: 'On a tie the first (lowest) threshold wins, which is what scikit-learn does within one feature.',
    },
  ],
};

/** The same search, runnable in the browser on bill lengths. Pure Python: no package downloads. */
export const splitRunner: CodeExample = {
  id: 'tree-split-runner',
  language: 'python',
  run: 'pyodide',
  source: SPLIT_SEARCH_SOURCE.replace(
    '{{xs}}',
    splitSlots.xs({ feature: 'bill_length_mm', candidate: 0, depth: 1 }),
  ).replace('{{feature}}', 'bill_length_mm'),
  annotations: [],
  expectedOutput: '41.95 0.2857',
};

export const treeSklearn: CodeExample = {
  id: 'tree-sklearn',
  language: 'python',
  source: `from sklearn.tree import DecisionTreeClassifier, export_text

# bill_length_mm, flipper_length_mm of the 14 penguins (rows 12 to 334 of penguins.csv)
X = ${toyXLiteral()}
y = ["Adelie"] * 6 + ["Gentoo"] * 4 + ["Chinstrap"] * 4

tree = DecisionTreeClassifier(max_depth={{depth}}, random_state=0)
tree.fit(X, y)
print(export_text(tree, feature_names=["bill_length_mm", "flipper_length_mm"]))`,
  slots: { depth: (s) => splitSlots.depth(sp(s)) },
  annotations: [
    {
      id: 'import',
      range: { line: 1, startCol: 25, endCol: 47 },
      match: 'DecisionTreeClassifier',
      kind: 'framework',
      title: 'DecisionTreeClassifier',
      what: 'scikit-learn’s CART tree for classes. Its default criterion is "gini".',
      why: 'It runs the same greedy search as the step-through, for every feature at every node.',
    },
    {
      id: 'X',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'X',
      kind: 'variable',
      title: 'X: shape (14, 2)',
      what: 'One row per penguin, one column per feature.',
      why: 'scikit-learn models take a 2-D table of features, even when it is a plain list of lists.',
      output: '14 rows × 2 features',
    },
    {
      id: 'y',
      range: { line: 7, startCol: 0, endCol: 1 },
      match: 'y',
      kind: 'variable',
      title: 'y: shape (14,)',
      what: 'The species of each row of X, in the same order.',
      why: 'Labels can be strings; scikit-learn sorts them into classes_ = Adelie, Chinstrap, Gentoo.',
    },
    {
      id: 'depth',
      range: { line: 9, startCol: 30, endCol: 49 },
      match: 'max_depth={{depth}}',
      kind: 'parameter',
      title: 'max_depth',
      what: 'The most questions on any path from the root to a leaf. Filled from the depth slider.',
      why: 'Without a limit the tree keeps splitting until every leaf is pure, which memorizes the training rows.',
    },
    {
      id: 'rs',
      range: { line: 9, startCol: 51, endCol: 65 },
      match: 'random_state=0',
      kind: 'parameter',
      title: 'random_state=0',
      what: 'Fixes the order in which features are tried.',
      why: 'When two features give exactly the same score, that order decides which wins. Fixing it makes the tree reproducible.',
    },
    {
      id: 'fit',
      range: { line: 10, startCol: 0, endCol: 14 },
      match: 'tree.fit(X, y)',
      kind: 'framework',
      title: 'tree.fit(X, y)',
      what: 'Grows the tree greedily from the root.',
      why: 'Training a tree is the split search, repeated at every node until a stopping rule holds.',
    },
    {
      id: 'export',
      range: { line: 11, startCol: 6, endCol: 23 },
      match: 'export_text(tree,',
      kind: 'framework',
      title: 'export_text',
      what: 'Prints the tree as indented rules, one line per branch.',
      why: 'It is the quickest way to read what a small tree learned. Thresholds print with 2 decimals.',
      output: 'See the readout: it shows what this prints for the current depth',
    },
  ],
};

export const boostSklearn: CodeExample = {
  id: 'tree-boost-sklearn',
  language: 'python',
  source: `from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error

# flipper_length_mm and body_mass_g of the same 14 penguins
X = ${boostSlots.X()}
y = ${boostSlots.y()}

model = GradientBoostingRegressor(n_estimators={{stages}}, learning_rate={{lr}}, max_depth=1)
model.fit(X, y)
print(round(mean_squared_error(y, model.predict(X)), 1))`,
  slots: { stages: (s) => boostSlots.stages(bs(s)), lr: (s) => boostSlots.lr(bs(s)) },
  annotations: [
    {
      id: 'gbr',
      range: { line: 1, startCol: 29, endCol: 54 },
      match: 'GradientBoostingRegressor',
      kind: 'framework',
      title: 'GradientBoostingRegressor',
      what: 'Gradient boosting for numbers. With the default loss="squared_error", each stage fits a tree to the residuals.',
      why: 'It is the algorithm in the chart above, so its training error matches the readout.',
    },
    {
      id: 'X',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'X',
      kind: 'variable',
      title: 'X: shape (14, 1)',
      what: 'One feature, flipper length, as a column: every row is a list of one number.',
      why: 'scikit-learn wants 2-D input even for a single feature.',
    },
    {
      id: 'n',
      range: { line: 8, startCol: 34, endCol: 57 },
      match: 'n_estimators={{stages}}',
      kind: 'parameter',
      title: 'n_estimators',
      what: 'How many stages (trees) to add. Filled from the stages slider.',
      why: 'More stages fit the training data more closely; too many start fitting noise.',
    },
    {
      id: 'lr',
      range: { line: 8, startCol: 59, endCol: 79 },
      match: 'learning_rate={{lr}}',
      kind: 'parameter',
      title: 'learning_rate',
      what: 'Each tree’s correction is multiplied by this before it is added.',
      why: 'Small steps need more stages but usually generalize better than full steps.',
    },
    {
      id: 'depth',
      range: { line: 8, startCol: 81, endCol: 92 },
      match: 'max_depth=1',
      kind: 'parameter',
      title: 'max_depth=1: stumps',
      what: 'Each tree asks one question, so it predicts one value left of a threshold and one value right of it.',
      why: 'Weak, simple trees are the usual building block of boosting (the default is 3).',
    },
    {
      id: 'fit',
      range: { line: 9, startCol: 0, endCol: 15 },
      match: 'model.fit(X, y)',
      kind: 'framework',
      title: 'model.fit(X, y)',
      what: 'Starts from the mean of y and adds n_estimators stumps, each fit to the current residuals.',
      why: 'This is the stage loop of the chart: F₀ = mean, Fₘ = Fₘ₋₁ + learning_rate · stump.',
    },
    {
      id: 'mse',
      range: { line: 10, startCol: 12, endCol: 51 },
      match: 'mean_squared_error(y, model.predict(X))',
      kind: 'function',
      title: 'Training mean squared error',
      what: 'The average of (actual − predicted)² over the 14 penguins, in g².',
      why: 'It is the loss boosting reduces, so it falls with every stage. It says nothing yet about new penguins.',
    },
  ],
};

export const forestSklearn: CodeExample = {
  id: 'tree-forest-sklearn',
  language: 'python',
  source: `import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

features = ["bill_length_mm", "flipper_length_mm"]
df = pd.read_csv("penguins.csv").dropna(subset=features)
X_train, X_test, y_train, y_test = train_test_split(
    df[features], df["species"], test_size=0.3, random_state=0, stratify=df["species"]
)

tree = DecisionTreeClassifier(random_state=0).fit(X_train, y_train)
forest = RandomForestClassifier(n_estimators=100, random_state=0).fit(X_train, y_train)
boosted = HistGradientBoostingClassifier(random_state=0).fit(X_train, y_train)
print("tree   ", round(tree.score(X_test, y_test), 3))
print("forest ", round(forest.score(X_test, y_test), 3))
print("boosted", round(boosted.score(X_test, y_test), 3))
print(forest.classes_)
print(forest.predict_proba(X_test.iloc[:3]).round(2))`,
  annotations: [
    {
      id: 'dropna',
      range: { line: 7, startCol: 32, endCol: 56 },
      match: '.dropna(subset=features)',
      kind: 'framework',
      title: 'dropna(subset=features)',
      what: 'Drops the 2 penguins with no measurements, leaving 342.',
      why: 'Every model then sees the same 342 complete rows, the ones the experiment’s forest uses too.',
    },
    {
      id: 'split',
      range: { line: 8, startCol: 35, endCol: 52 },
      match: 'train_test_split(',
      kind: 'framework',
      title: 'train_test_split',
      what: 'Holds back 30 % of the rows (103 penguins) for testing.',
      why: 'Accuracy on rows the model trained on says little: a full tree gets every training row right.',
    },
    {
      id: 'strat',
      range: { line: 9, startCol: 64, endCol: 86 },
      match: 'stratify=df["species"]',
      kind: 'parameter',
      title: 'stratify',
      what: 'Keeps the species proportions the same in both parts.',
      why: 'Chinstraps are only 68 of 342 rows; stratifying makes sure the test set has its share.',
    },
    {
      id: 'tree',
      range: { line: 12, startCol: 7, endCol: 45 },
      match: 'DecisionTreeClassifier(random_state=0)',
      kind: 'framework',
      title: 'One full tree',
      what: 'No max_depth: the tree splits until every leaf is pure.',
      why: 'The baseline the ensembles have to beat.',
    },
    {
      id: 'forest',
      range: { line: 13, startCol: 9, endCol: 65 },
      match: 'RandomForestClassifier(n_estimators=100, random_state=0)',
      kind: 'framework',
      title: 'RandomForestClassifier',
      what: '100 full trees, each on a bootstrap sample, each split trying max_features="sqrt" random features (1 of 2 here).',
      why: 'random_state fixes every random draw, so the result is reproducible. Its generator differs from the experiment’s, so the trees differ too.',
    },
    {
      id: 'hgb',
      range: { line: 14, startCol: 10, endCol: 56 },
      match: 'HistGradientBoostingClassifier(random_state=0)',
      kind: 'framework',
      title: 'HistGradientBoostingClassifier',
      what: 'scikit-learn’s fast gradient boosting: it bins each feature into at most 255 values before searching splits.',
      why: 'It is the version to use on real tabular data; it also handles missing values natively.',
    },
    {
      id: 'score',
      range: { line: 15, startCol: 23, endCol: 49 },
      match: 'tree.score(X_test, y_test)',
      kind: 'framework',
      title: '.score(X_test, y_test)',
      what: 'Accuracy: the fraction of held-out penguins classified correctly.',
      why: 'Measured on rows none of the models saw.',
    },
    {
      id: 'proba',
      range: { line: 19, startCol: 6, endCol: 43 },
      match: 'forest.predict_proba(X_test.iloc[:3])',
      kind: 'framework',
      title: 'predict_proba',
      what: 'The average over the trees of each tree’s class probabilities, one column per class in classes_ order.',
      why: 'scikit-learn’s forest averages probabilities instead of counting votes. With full trees, leaves are nearly always pure, so this is close to the vote share.',
      output: 'Shape (3, 3): one row per penguin',
    },
  ],
  expectedOutput: `tree    0.922
forest  0.981
boosted 0.951
['Adelie' 'Chinstrap' 'Gentoo']
[[0.91 0.09 0.  ]
 [0.   0.01 0.99]
 [0.   0.02 0.98]]`,
};
