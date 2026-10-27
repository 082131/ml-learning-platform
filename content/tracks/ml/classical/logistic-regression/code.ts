// Code for the logistic-regression lesson. Expected outputs were copied from real runs with CPython 3.13,
// NumPy 2.4.6, pandas 3.0.2 and scikit-learn 1.8.0 (the versions Pyodide 314.0.7 ships), next to
// src/lib/classical/data/penguins.csv. The NumPy training loop and the one-penguin prediction are also
// checked against the TypeScript experiment in src/lib/classical/logistic.test.ts (Python results as fixtures).
import {
  logisticExperiment,
  PREDICT_SOURCE,
  predictSlots,
  type LogState,
} from '@/lib/classical/logisticExperiment';
import type { CodeExample } from '@/lib/types';

const PREDICT_ID = 'logreg-predict';

/** Learning rate, steps and the selected penguin: the plot, the curves, both code blocks and the trace. */
export const logExp = logisticExperiment('logreg', PREDICT_ID);

const st = (s: unknown) => s as LogState;
const slot = (name: string) => (s: unknown) => predictSlots(st(s), logExp.compute(st(s)))[name]!;

export const predictCode: CodeExample = {
  id: PREDICT_ID,
  language: 'python',
  source: PREDICT_SOURCE,
  slots: { x: slot('x'), who: slot('who'), w: slot('w') },
  annotations: [
    {
      id: 'x',
      range: { line: 3, startCol: 26, endCol: 31 },
      match: '{{x}}',
      kind: 'parameter',
      title: 'The selected penguin’s bill',
      what: 'Bill length and bill depth in millimetres, from penguins.csv.',
      why: 'Filled from the “Selected penguin” slider, so this code scores the penguin ringed in the plot.',
    },
    {
      id: 'mean',
      range: { line: 4, startCol: 0, endCol: 4 },
      match: 'mean',
      kind: 'variable',
      title: 'Training means',
      what: 'The average bill length and depth of the 165 training penguins.',
      why: 'Standardizing uses training statistics only, so the test penguins stay unseen.',
    },
    {
      id: 'std',
      range: { line: 5, startCol: 0, endCol: 3 },
      match: 'std',
      kind: 'variable',
      title: 'Training standard deviations',
      what: 'How spread out each feature is in the training set (NumPy’s default, dividing by n).',
      why: 'Dividing by them puts both features on the same scale, about −2 to 2.',
    },
    {
      id: 'w',
      range: { line: 6, startCol: 12, endCol: 17 },
      match: '{{w}}',
      kind: 'parameter',
      title: 'The trained weights',
      what: 'w1 and w2 multiply the standardized features; b is the bias. Shown at full precision.',
      why: 'Filled from the training run above, so changing the learning rate or the steps changes them.',
    },
    {
      id: 'standardize',
      range: { line: 7, startCol: 5, endCol: 37 },
      match: '(bill_length - mean[0]) / std[0]',
      kind: 'math',
      title: '(x − mean) / std',
      what: 'How many standard deviations this bill is above (positive) or below (negative) the training average.',
      why: 'The model was trained on standardized features, so it must see new penguins the same way.',
    },
    {
      id: 'z',
      range: { line: 9, startCol: 4, endCol: 25 },
      match: 'w1 * x1 + w2 * x2 + b',
      kind: 'math',
      title: 'The score z = w·x + b',
      what: 'A weighted sum, exactly as in linear regression. Any real number.',
      why: 'z = 0 is the decision boundary; positive z leans Chinstrap, negative leans Adelie.',
    },
    {
      id: 'sigmoid',
      range: { line: 10, startCol: 4, endCol: 26 },
      match: '1 / (1 + math.exp(-z))',
      kind: 'math',
      title: 'The sigmoid σ(z)',
      what: 'Squashes z into a number between 0 and 1: σ(0) = 0.5, large z gives nearly 1, very negative z nearly 0.',
      why: 'The output is read as P(Chinstrap | this bill).',
    },
    {
      id: 'threshold',
      range: { line: 11, startCol: 32, endCol: 69 },
      match: '"Chinstrap" if p >= 0.5 else "Adelie"',
      kind: 'syntax',
      title: 'Threshold at 0.5',
      what: 'Turns the probability into a class.',
      why: '0.5 is the usual default. The metrics lesson shows how moving it trades one kind of mistake for another.',
    },
  ],
};

/** The NumPy training loop, filled from the learning rate and steps controls. */
export const numpyLogGD: CodeExample = {
  id: 'logreg-numpy-gd',
  language: 'python',
  source: `import numpy as np
import pandas as pd

df = pd.read_csv("penguins.csv")
pair = df[df["species"].isin(["Adelie", "Chinstrap"])]
pair = pair.dropna(subset=["bill_length_mm", "bill_depth_mm"])
test = pair.iloc[3::4]  # every 4th penguin is held out
train = pair.drop(test.index)
X = train[["bill_length_mm", "bill_depth_mm"]].to_numpy()  # shape (165, 2)
y = (train["species"] == "Chinstrap").to_numpy().astype(float)  # 1 = Chinstrap
mean, std = X.mean(axis=0), X.std(axis=0)
Z = (X - mean) / std  # standardized with training statistics
w = np.zeros(2)
b = 0.0
lr = {{lr}}
for step in range({{steps}}):
    p = 1 / (1 + np.exp(-(Z @ w + b)))
    w = w - lr * (Z.T @ (p - y)) / len(y)
    b = b - lr * np.mean(p - y)
p = 1 / (1 + np.exp(-(Z @ w + b)))
loss = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))
print(f"w1={w[0]:.4f} w2={w[1]:.4f} b={b:.4f}")
print(f"log loss={loss:.4f} accuracy={np.mean((p >= 0.5) == y):.4f}")`,
  slots: { lr: (s) => String(st(s).lr), steps: (s) => String(st(s).steps) },
  annotations: [
    {
      id: 'pair',
      range: { line: 5 },
      kind: 'framework',
      title: 'Keep two species',
      what: 'Boolean indexing with isin keeps the Adelie and Chinstrap rows (the Gentoo rows are dropped).',
      why: 'Logistic regression in this form separates exactly two classes.',
    },
    {
      id: 'dropna',
      range: { line: 6, startCol: 12, endCol: 18 },
      match: 'dropna',
      kind: 'framework',
      title: 'dropna(subset=...)',
      what: 'Drops the penguins with a missing bill measurement (1 Adelie row here), leaving 219.',
      why: 'The arithmetic below would turn a missing value into NaN and spread it to every weight.',
    },
    {
      id: 'split',
      range: { line: 7, startCol: 7, endCol: 22 },
      match: 'pair.iloc[3::4]',
      kind: 'framework',
      title: 'iloc[3::4]',
      what: 'Positions 3, 7, 11, …: every 4th penguin, 54 of them, becomes the test set.',
      why: 'A fixed rule keeps the lesson reproducible. In a project you would shuffle with a seed or stratify (see the splits lesson).',
    },
    {
      id: 'numpy',
      range: { line: 9, startCol: 46, endCol: 57 },
      match: '.to_numpy()',
      kind: 'framework',
      title: '.to_numpy()',
      what: 'Turns the two DataFrame columns into a plain array of shape (165, 2).',
      why: 'The loop uses matrix products (@), which need arrays.',
    },
    {
      id: 'labels',
      range: { line: 10, startCol: 4, endCol: 37 },
      match: '(train["species"] == "Chinstrap")',
      kind: 'math',
      title: 'Labels: 1 for Chinstrap, 0 for Adelie',
      what: 'A comparison gives True or False per penguin; astype(float) turns them into 1.0 and 0.0.',
      why: 'Log loss and the gradient need numeric labels.',
    },
    {
      id: 'stats',
      range: { line: 11, startCol: 12, endCol: 41 },
      match: 'X.mean(axis=0), X.std(axis=0)',
      kind: 'framework',
      title: 'Column means and standard deviations',
      what: 'axis=0 computes one value per column (per feature). np.std divides by n by default.',
      why: 'Computed on the training rows only, then reused for every penguin we score.',
      output: 'Two arrays of shape (2,)',
    },
    {
      id: 'Z',
      range: { line: 12, startCol: 4, endCol: 20 },
      match: '(X - mean) / std',
      kind: 'math',
      title: 'Standardize',
      what: 'Broadcasting subtracts each column’s mean and divides by its standard deviation.',
      why: 'Equal scales make the loss surface round, so one learning rate suits both weights.',
      output: 'shape (165, 2)',
    },
    {
      id: 'lr',
      range: { line: 15, startCol: 5, endCol: 11 },
      match: '{{lr}}',
      kind: 'parameter',
      title: 'Learning rate',
      what: 'The step size, from the experiment’s control.',
      why: 'The log loss is gentler than MSE: even 30 does not diverge here, while 0.01 barely moves.',
    },
    {
      id: 'steps',
      range: { line: 16, startCol: 12, endCol: 28 },
      match: 'range({{steps}})',
      kind: 'function',
      title: 'Steps',
      what: 'How many full-batch updates to run.',
      why: 'Each update uses all 165 training penguins.',
    },
    {
      id: 'p',
      range: { line: 17, startCol: 8, endCol: 38 },
      match: '1 / (1 + np.exp(-(Z @ w + b)))',
      kind: 'math',
      title: 'p = σ(Zw + b)',
      what: 'Scores all 165 penguins at once (Z @ w has shape (165,)) and squashes them into probabilities.',
      why: 'The gradient needs the current prediction for every training penguin.',
    },
    {
      id: 'grad-w',
      range: { line: 18, startCol: 17, endCol: 41 },
      match: '(Z.T @ (p - y)) / len(y)',
      kind: 'math',
      title: '∂loss/∂w = Zᵀ(p − y) / n',
      what: 'Each penguin pushes the weights by its error p − y times its features, averaged.',
      why: 'For the sigmoid with log loss the gradient has this simple form, with no σ′ factor left over.',
      output: 'shape (2,)',
    },
    {
      id: 'grad-b',
      range: { line: 19, startCol: 17, endCol: 31 },
      match: 'np.mean(p - y)',
      kind: 'math',
      title: '∂loss/∂b = mean(p − y)',
      what: 'The average error. If the model says Chinstrap too often, it is positive and b goes down.',
      why: 'b shifts the boundary without turning it.',
    },
    {
      id: 'loss',
      range: { line: 21, startCol: 7, endCol: 56 },
      match: '-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))',
      kind: 'math',
      title: 'Mean log loss',
      what: 'For a Chinstrap it adds −log p; for an Adelie −log(1 − p). Confident wrong answers cost the most.',
      why: 'This is what the loop is minimizing; the readout shows the same value.',
    },
  ],
};

/** scikit-learn with its default C = 1.0 and with no penalty. */
export const sklearnLog: CodeExample = {
  id: 'logreg-sklearn',
  language: 'python',
  source: `import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("penguins.csv")
pair = df[df["species"].isin(["Adelie", "Chinstrap"])]
pair = pair.dropna(subset=["bill_length_mm", "bill_depth_mm"])
test = pair.iloc[3::4]
train = pair.drop(test.index)
features = ["bill_length_mm", "bill_depth_mm"]
scaler = StandardScaler().fit(train[features])
Z_train = scaler.transform(train[features])
Z_test = scaler.transform(test[features])
y_train = (train["species"] == "Chinstrap").astype(int)
y_test = (test["species"] == "Chinstrap").astype(int)

for C in [1.0, np.inf]:
    model = LogisticRegression(C=C).fit(Z_train, y_train)
    w = model.coef_[0]
    b = model.intercept_[0]
    acc = model.score(Z_test, y_test)
    print(f"C={C}: w1={w[0]:.4f} w2={w[1]:.4f} b={b:.4f} test accuracy={acc:.4f}")`,
  annotations: [
    {
      id: 'scaler',
      range: { line: 12, startCol: 9, endCol: 46 },
      match: 'StandardScaler().fit(train[features])',
      kind: 'framework',
      title: 'StandardScaler().fit(train)',
      what: 'Learns each column’s mean and standard deviation (dividing by n, like np.std) from the training rows.',
      why: 'Same statistics as the NumPy loop, so the features are identical.',
    },
    {
      id: 'transform',
      range: { line: 14, startCol: 9, endCol: 41 },
      match: 'scaler.transform(test[features])',
      kind: 'framework',
      title: 'transform(test)',
      what: 'Standardizes the test penguins with the training mean and standard deviation.',
      why: 'Fitting the scaler on test data would leak information about the test set into training.',
    },
    {
      id: 'C-values',
      range: { line: 18, startCol: 9, endCol: 22 },
      match: '[1.0, np.inf]',
      kind: 'parameter',
      title: 'C: inverse regularization strength',
      what: 'The default C = 1.0 adds an L2 penalty on the weights; C = np.inf removes it.',
      why: 'The penalty is why scikit-learn’s default weights are smaller than plain gradient descent’s.',
    },
    {
      id: 'fit',
      range: { line: 19, startCol: 12, endCol: 35 },
      match: 'LogisticRegression(C=C)',
      kind: 'framework',
      title: 'LogisticRegression(C=C).fit(...)',
      what: 'Minimizes the log loss (plus the penalty) with the L-BFGS solver until it converges.',
      why: 'No learning rate or step count to choose: the solver picks its own steps.',
    },
    {
      id: 'coef',
      range: { line: 20, startCol: 8, endCol: 22 },
      match: 'model.coef_[0]',
      kind: 'framework',
      title: 'coef_ and intercept_',
      what: 'coef_ has shape (1, 2) for a two-class problem: one row of weights. intercept_ has shape (1,).',
      why: '[0] takes that single row, so w[0] and w[1] line up with w1 and w2 in the NumPy loop.',
    },
    {
      id: 'score',
      range: { line: 22, startCol: 10, endCol: 37 },
      match: 'model.score(Z_test, y_test)',
      kind: 'framework',
      title: 'model.score',
      what: 'Accuracy on the held-out penguins, with the 0.5 threshold.',
      why: 'Training accuracy alone would not show how the model does on penguins it has not seen.',
    },
  ],
  expectedOutput: `C=1.0: w1=3.8127 w2=-1.1936 b=-1.8970 test accuracy=0.9630
C=inf: w1=10.8703 w2=-4.5112 b=-4.6723 test accuracy=0.9815`,
};

/** Pure Python, so it runs in the browser without downloading NumPy. */
export const sigmoidRunner: CodeExample = {
  id: 'logreg-sigmoid-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

for z in [-4, -2, 0, 2, 4]:
    print(z, round(sigmoid(z), 4))`,
  annotations: [],
  expectedOutput: `-4 0.018
-2 0.1192
0 0.5
2 0.8808
4 0.982`,
};
