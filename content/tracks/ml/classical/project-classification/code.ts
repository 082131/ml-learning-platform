// Code for the classification project. Every output below was produced by running the code with CPython 3.13
// and the library versions Pyodide 314.0.7 ships (pandas 3.0.2, NumPy 2.4.6, scikit-learn 1.8.0) on
// src/lib/classical/data/penguins.csv. The scikit-learn scripts are meant to run on your computer; the page
// shows their output from that run, labeled as expected output. The pure-Python runner uses the real test
// labels and predictions printed by the same run, so it reproduces the scikit-learn confusion matrix.
import type { CodeExample, ProjectBrief } from '@/lib/types';
import type { FlowEdge, FlowNode } from '@/lib/viz/flow';

export const compareScript: CodeExample = {
  id: 'project-compare',
  language: 'python',
  source: `import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

df = pd.read_csv("penguins.csv").dropna(subset=["sex"])
numeric = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
categorical = ["species", "island"]
X = df[numeric + categorical]
y = (df["sex"] == "male").astype(int)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
print(X_train.shape, X_test.shape)

prep = ColumnTransformer([
    ("num", StandardScaler(), numeric),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
])
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
models = {
    "baseline": DummyClassifier(strategy="most_frequent"),
    "logistic": LogisticRegression(max_iter=1000),
    "forest": RandomForestClassifier(n_estimators=300, random_state=0),
}
for name, model in models.items():
    scores = cross_val_score(make_pipeline(prep, model), X_train, y_train, cv=cv)
    print(f"{name:9s} {scores.mean():.3f} ± {scores.std():.3f}")`,
  annotations: [
    {
      id: 'dropna',
      range: { line: 10, startCol: 32, endCol: 55 },
      match: '.dropna(subset=["sex"])',
      kind: 'framework',
      title: '.dropna(subset=["sex"])',
      what: 'Removes the rows whose sex is missing: 11 of the 344 penguins.',
      why: 'You cannot train on or score a row without a label. Rows missing only a feature could be imputed instead, but here dropping the label-less rows also removes the 2 rows with no measurements.',
      output: '333 rows',
    },
    {
      id: 'X',
      range: { line: 13, startCol: 0, endCol: 29 },
      match: 'X = df[numeric + categorical]',
      kind: 'variable',
      title: 'X: the features',
      what: 'The 4 measurements plus species and island. Year is left out on purpose.',
      why: 'The year a penguin was measured says nothing about its sex, and a model can latch onto such columns by accident.',
      output: 'a DataFrame of shape (333, 6)',
    },
    {
      id: 'y',
      range: { line: 14, startCol: 4, endCol: 37 },
      match: '(df["sex"] == "male").astype(int)',
      kind: 'variable',
      title: 'y: the label as 0 or 1',
      what: 'True for male, False for female, turned into 1 and 0.',
      why: 'Metrics such as precision and recall need to know which class counts as positive. Here male = 1.',
      output: '168 ones and 165 zeros',
    },
    {
      id: 'split',
      range: { line: 16, startCol: 35, endCol: 52 },
      match: 'train_test_split(',
      kind: 'framework',
      title: 'train_test_split(...)',
      what: 'Shuffles the rows and sets 20% aside as the test set.',
      why: 'The test set is touched once, at the very end, so its score estimates performance on penguins the model has never seen.',
      inputs: 'X, y, test_size=0.2, stratify=y, random_state=42',
      output: 'X_train (266, 6), X_test (67, 6)',
    },
    {
      id: 'test-size',
      range: { line: 17, startCol: 10, endCol: 23 },
      match: 'test_size=0.2',
      kind: 'parameter',
      title: 'test_size=0.2',
      what: 'The share of rows that goes to the test set: 20% of 333, rounded up to 67.',
      why: 'Enough rows for a rough final check while keeping most data for training and cross-validation.',
    },
    {
      id: 'stratify',
      range: { line: 17, startCol: 25, endCol: 35 },
      match: 'stratify=y',
      kind: 'parameter',
      title: 'stratify=y',
      what: 'Keeps the male/female ratio the same in both parts.',
      why: 'With a small dataset an unlucky shuffle could put most males in one part, and the scores would mislead.',
    },
    {
      id: 'ct',
      range: { line: 21, startCol: 7, endCol: 25 },
      match: 'ColumnTransformer(',
      kind: 'framework',
      title: 'ColumnTransformer([...])',
      what: 'Applies different preprocessing to different columns and puts the results side by side.',
      why: 'Measurements need scaling; species and island need one-hot encoding. Each step is fitted on training folds only when it sits inside the pipeline.',
      output: '4 scaled columns + 6 one-hot columns (3 species, 3 islands)',
    },
    {
      id: 'scaler',
      range: { line: 22, startCol: 12, endCol: 28 },
      match: 'StandardScaler()',
      kind: 'framework',
      title: 'StandardScaler()',
      what: 'Subtracts each column’s mean and divides by its standard deviation, both learned from the data it is fitted on.',
      why: 'Logistic regression with its default L2 penalty is sensitive to feature scale: body mass in grams would otherwise dwarf bill depth in millimetres.',
    },
    {
      id: 'onehot',
      range: { line: 23, startCol: 12, endCol: 50 },
      match: 'OneHotEncoder(handle_unknown="ignore")',
      kind: 'framework',
      title: 'OneHotEncoder(handle_unknown="ignore")',
      what: 'Turns each category into its own 0/1 column.',
      why: 'Models need numbers, and one-hot avoids inventing an order such as Adelie < Chinstrap < Gentoo. "ignore" encodes a category unseen in training as all zeros instead of raising an error.',
    },
    {
      id: 'cv',
      range: { line: 25, startCol: 5, endCol: 62 },
      match: 'StratifiedKFold(n_splits=5, shuffle=True, random_state=0)',
      kind: 'framework',
      title: 'StratifiedKFold(...)',
      what: 'Splits the training rows into 5 folds with the same class balance in each.',
      why: 'Every model is scored on the same 5 folds, so the comparison is fair. A fixed random_state makes it reproducible.',
    },
    {
      id: 'dummy',
      range: { line: 27, startCol: 16, endCol: 57 },
      match: 'DummyClassifier(strategy="most_frequent")',
      kind: 'framework',
      title: 'DummyClassifier(strategy="most_frequent")',
      what: 'Always predicts the most common class in its training data, ignoring the features.',
      why: 'A baseline: any real model has to beat it, or it has learned nothing useful.',
    },
    {
      id: 'logreg',
      range: { line: 28, startCol: 16, endCol: 49 },
      match: 'LogisticRegression(max_iter=1000)',
      kind: 'framework',
      title: 'LogisticRegression(max_iter=1000)',
      what: 'Logistic regression with scikit-learn’s defaults: L2 regularization with C=1.0.',
      why: 'max_iter raises the solver’s iteration limit, so it converges instead of warning.',
    },
    {
      id: 'forest',
      range: { line: 29, startCol: 14, endCol: 70 },
      match: 'RandomForestClassifier(n_estimators=300, random_state=0)',
      kind: 'framework',
      title: 'RandomForestClassifier(...)',
      what: '300 decision trees on bootstrap samples, voting on the class.',
      why: 'A different model family: it can capture interactions (for example, heavy for a Gentoo is not heavy for an Adelie) without hand-made features.',
    },
    {
      id: 'cvs',
      range: { line: 32, startCol: 13, endCol: 29 },
      match: 'cross_val_score(',
      kind: 'framework',
      title: 'cross_val_score(...)',
      what: 'Fits a fresh copy of the pipeline on 4 folds and scores it on the 5th, for each of the 5 folds.',
      why: 'The default score for a classifier is accuracy. Only training rows are used, so the test set stays untouched.',
      output: 'an array of 5 accuracies',
    },
    {
      id: 'pipe',
      range: { line: 32, startCol: 29, endCol: 55 },
      match: 'make_pipeline(prep, model)',
      kind: 'framework',
      title: 'make_pipeline(prep, model)',
      what: 'Chains preprocessing and model into one object with fit and predict.',
      why: 'Inside cross-validation the scaler is refitted on each training fold, so no statistics leak from the validation fold.',
    },
  ],
  expectedOutput: `(266, 6) (67, 6)
baseline  0.504 ± 0.008
logistic  0.914 ± 0.035
forest    0.910 ± 0.030`,
};

/** Runs after compareScript, in the same file. */
export const finalScript: CodeExample = {
  id: 'project-final',
  language: 'python',
  source: `from sklearn.metrics import classification_report, confusion_matrix

best = make_pipeline(prep, LogisticRegression(max_iter=1000))
best.fit(X_train, y_train)
pred = best.predict(X_test)
print(confusion_matrix(y_test, pred))
print(classification_report(y_test, pred, target_names=["female", "male"], digits=3))`,
  annotations: [
    {
      id: 'fit',
      range: { line: 4, startCol: 0, endCol: 26 },
      match: 'best.fit(X_train, y_train)',
      kind: 'framework',
      title: 'best.fit(X_train, y_train)',
      what: 'Fits the chosen pipeline on all 266 training rows.',
      why: 'Cross-validation picked the model; now it gets all the training data before the one final test.',
    },
    {
      id: 'predict',
      range: { line: 5, startCol: 7, endCol: 27 },
      match: 'best.predict(X_test)',
      kind: 'framework',
      title: 'best.predict(X_test)',
      what: 'Predicts 0 or 1 for each of the 67 test penguins, using a 0.5 probability threshold.',
      why: 'These predictions are compared with the true labels exactly once.',
      output: '67 predictions',
    },
    {
      id: 'cm',
      range: { line: 6, startCol: 6, endCol: 36 },
      match: 'confusion_matrix(y_test, pred)',
      kind: 'framework',
      title: 'confusion_matrix(y_test, pred)',
      what: 'Counts each (true, predicted) pair. Rows are the true class, columns the predicted class, in the order 0 (female), 1 (male).',
      why: 'It shows which mistakes the model makes, which a single accuracy number hides.',
      output: '[[28 5] [1 33]]: 5 females predicted male, 1 male predicted female',
    },
    {
      id: 'report',
      range: { line: 7, startCol: 6, endCol: 28 },
      match: 'classification_report(',
      kind: 'framework',
      title: 'classification_report(...)',
      what: 'Precision, recall and F1 for each class, plus averages.',
      why: 'Recall for female is 0.848: 28 of the 33 test females were found.',
    },
  ],
  expectedOutput: `[[28  5]
 [ 1 33]]
              precision    recall  f1-score   support

      female      0.966     0.848     0.903        33
        male      0.868     0.971     0.917        34

    accuracy                          0.910        67
   macro avg      0.917     0.910     0.910        67
weighted avg      0.916     0.910     0.910        67`,
};

/** Pure Python, so it runs in the browser with no package download. */
export const evaluationRunner: CodeExample = {
  id: 'project-evaluate',
  language: 'python',
  run: 'pyodide',
  source: `# Labels of the 67 test penguins (1 = male, 0 = female) and the logistic pipeline's predictions.
y_test = [1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1]
pred = [1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1]

pairs = list(zip(y_test, pred))
tp = pairs.count((1, 1))
tn = pairs.count((0, 0))
fp = pairs.count((0, 1))
fn = pairs.count((1, 0))
print("confusion matrix [[tn, fp], [fn, tp]]:", [[tn, fp], [fn, tp]])
print("accuracy :", round((tp + tn) / len(pairs), 3))
print("precision:", round(tp / (tp + fp), 3))
print("recall   :", round(tp / (tp + fn), 3))

majority = max(set(y_test), key=y_test.count)
print("baseline accuracy (always", majority, "):", round(y_test.count(majority) / len(y_test), 3))`,
  annotations: [],
  expectedOutput: `confusion matrix [[tn, fp], [fn, tp]]: [[28, 5], [1, 33]]
accuracy : 0.91
precision: 0.868
recall   : 0.971
baseline accuracy (always 1 ): 0.507`,
};

/** The project's workflow, for the FlowDiagram in the Visual section. */
export const pipelineNodes: FlowNode[] = [
  { id: 'load', label: 'Load CSV', detail: '344 rows', x: 0, y: 0 },
  { id: 'clean', label: 'Drop missing sex', detail: '333 rows', x: 190, y: 0 },
  { id: 'split', label: 'Stratified split', detail: '266 / 67', x: 380, y: 0 },
  { id: 'test', label: 'Test set', detail: 'locked away', x: 570, y: 0 },
  { id: 'cv', label: '5-fold CV', detail: 'train rows only', x: 380, y: 110 },
  { id: 'pick', label: 'Pick a model', detail: 'beat baseline', x: 190, y: 110 },
  { id: 'fit', label: 'Refit on train', detail: '266 rows', x: 0, y: 110 },
  { id: 'score', label: 'Score once', detail: '67 rows', x: 0, y: 220 },
  { id: 'errors', label: 'Error analysis', detail: '6 mistakes', x: 0, y: 330 },
];

export const pipelineEdges: FlowEdge[] = [
  { from: 'load', to: 'clean' },
  { from: 'clean', to: 'split' },
  { from: 'split', to: 'test', label: 'test' },
  { from: 'split', to: 'cv', label: 'train' },
  { from: 'cv', to: 'pick' },
  { from: 'pick', to: 'fit' },
  { from: 'fit', to: 'score' },
  { from: 'test', to: 'score', fromSide: 'bottom', toSide: 'right', label: 'test', junction: 'square' },
  { from: 'score', to: 'errors' },
];

export const brief: ProjectBrief = {
  goal: 'Predict a penguin’s sex from its measurements, species and island, and report how well the model does on penguins it has never seen. Then repeat the workflow on a second target of your choice (species from measurements only is a good, easier one).',
  dataset:
    'penguins.csv (Palmer penguins, CC0): 344 rows, 8 columns. Download it from the palmerpenguins project (see References) and keep it next to your script. 11 rows have no sex; 2 of those have no measurements either.',
  milestones: [
    'Load the CSV with pandas, print `df.shape`, `df.isna().sum()` and `df["sex"].value_counts()`, and write one sentence on what you will predict and why accuracy is a fair first metric here',
    'Drop the rows without a label, choose your feature columns (and say why `year` is left out), and split off a stratified 20% test set with a fixed `random_state`',
    'Build one `ColumnTransformer` that scales the numeric columns and one-hot encodes `species` and `island`, and wrap it with each model in `make_pipeline`',
    'Score a `DummyClassifier` baseline, logistic regression and a random forest with 5-fold stratified cross-validation on the training rows, and record mean ± standard deviation',
    'Choose one model and justify the choice using the spread across folds, not just the means',
    'Refit the chosen pipeline on all training rows and score it once on the test set: confusion matrix and `classification_report`',
    'List every misclassified test penguin with its features and true label, and write down at least one pattern you see',
    'Write a short report (half a page): data, method, cross-validation table, test results, errors, and one idea you would try next',
  ],
  rubric: [
    {
      criterion: 'No leakage',
      detail:
        'All preprocessing sits inside the pipeline, model choice uses cross-validation on training rows only, and the test set is scored once.',
    },
    {
      criterion: 'Fair comparison',
      detail:
        'Every model, including the baseline, is scored on the same folds, and the report shows mean ± standard deviation.',
    },
    {
      criterion: 'Right metrics',
      detail:
        'The report has the confusion matrix and per-class precision and recall, and says which mistakes the model makes, not only its accuracy.',
    },
    {
      criterion: 'Error analysis',
      detail:
        'Misclassified rows are listed and at least one hypothesis about them is stated and checked against the data.',
    },
    {
      criterion: 'Reproducible',
      detail:
        'Fixed random seeds, pinned library versions (for example `pip install scikit-learn==1.8.0 pandas==3.0.2`), and the script runs from top to bottom without edits.',
    },
  ],
  hints: [
    'If your cross-validation scores differ from this page’s, check the seeds (`random_state=42` for the split, `random_state=0` for the folds) and your scikit-learn version: small differences between versions are normal.',
    'To see the misclassified rows: `X_test[pred != y_test]` gives their features; add the true label with `.assign(sex=...)`.',
    'Pattern to test in the error analysis: most mistakes on this split are females predicted male. Compare their body mass with the average female of the same species (`df.groupby(["species", "sex"])["body_mass_g"].mean()`).',
    'For the second target, `species` has three classes: use `classification_report` as before, and note that the confusion matrix becomes 3 × 3.',
  ],
};
