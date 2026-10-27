// Code for the linear-regression lesson. Every expected output below was copied from a real run with
// CPython 3.13, NumPy 2.4.6 and scikit-learn 1.8.0 (the versions Pyodide 314.0.7 ships). The MSE loop
// and the gradient descent loop are also checked against the TypeScript experiments in
// src/lib/classical/linearRegression.test.ts, with the Python results stored as fixtures.
import {
  fitExperiment,
  gdExperiment,
  MSE_LOOP_SOURCE,
  mseLoopSlots,
  X_LIST,
  Y_LIST,
  type FitState,
  type GDLinState,
} from '@/lib/classical/linearRegressionExperiment';
import type { CodeExample } from '@/lib/types';

const MSE_LOOP_ID = 'linreg-mse-loop';

/** Slope, intercept and the selected penguin: the scatter plot, the MSE loop and its trace read this. */
export const fitExp = fitExperiment('linreg-fit', MSE_LOOP_ID);
/** Learning rate, steps and raw or centered x: the gradient descent charts and the NumPy loop read this. */
export const gdExp = gdExperiment('linreg-gd');

const fit = (s: unknown) => s as FitState;
const gd = (s: unknown) => s as GDLinState;

export const mseLoop: CodeExample = {
  id: MSE_LOOP_ID,
  language: 'python',
  source: MSE_LOOP_SOURCE,
  slots: { w: (s) => mseLoopSlots(fit(s)).w, b: (s) => mseLoopSlots(fit(s)).b },
  annotations: [
    {
      id: 'x',
      range: { line: 1, startCol: 0, endCol: 1 },
      match: 'x',
      kind: 'variable',
      title: 'x: the feature',
      what: 'Flipper lengths of 12 penguins in centimetres (rows 0, 30, …, 321 of penguins.csv).',
      why: 'x is what we predict from. Centimetres keep the slope a small, readable number.',
      output: '12 numbers',
    },
    {
      id: 'y',
      range: { line: 2, startCol: 0, endCol: 1 },
      match: 'y',
      kind: 'variable',
      title: 'y: the target',
      what: 'The same penguins’ body masses in kilograms. y[i] belongs to x[i].',
      why: 'The line should predict these values, so the residuals are measured against them.',
    },
    {
      id: 'w',
      range: { line: 3, startCol: 4, endCol: 9 },
      match: '{{w}}',
      kind: 'parameter',
      title: 'w: the slope',
      what: 'How many kilograms the prediction rises per extra centimetre of flipper.',
      why: 'Filled from the slope slider, so this code computes the MSE of the line you drew.',
    },
    {
      id: 'b',
      range: { line: 4, startCol: 4, endCol: 9 },
      match: '{{b}}',
      kind: 'parameter',
      title: 'b: the intercept',
      what: 'The prediction at x = 0, in kilograms. It shifts the whole line up or down.',
      why: 'No penguin has a 0 cm flipper, so b on its own means little; together with w it places the line.',
    },
    {
      id: 'total',
      range: { line: 5 },
      kind: 'syntax',
      title: 'total = 0.0',
      what: 'Starts the running sum of squared residuals at zero.',
      why: 'The loop adds one squared residual per penguin.',
    },
    {
      id: 'loop',
      range: { line: 6, startCol: 9, endCol: 22 },
      match: 'range(len(x))',
      kind: 'function',
      title: 'range(len(x))',
      what: 'Counts i = 0, 1, …, 11: one pass per penguin.',
      why: 'MSE averages over every example, so every penguin is visited once.',
    },
    {
      id: 'y-hat',
      range: { line: 7, startCol: 12, endCol: 24 },
      match: 'w * x[i] + b',
      kind: 'math',
      title: 'ŷ = w·x + b',
      what: 'The line’s prediction for penguin i.',
      why: 'This is the whole model: one multiplication and one addition.',
      output: 'A predicted mass in kg',
    },
    {
      id: 'r',
      range: { line: 8, startCol: 8, endCol: 20 },
      match: 'y[i] - y_hat',
      kind: 'math',
      title: 'Residual r = y − ŷ',
      what: 'How far the real mass is from the prediction. Positive means the penguin sits above the line.',
      why: 'Residuals are what the line got wrong; the loss is built from them.',
    },
    {
      id: 'square',
      range: { line: 9, startCol: 20, endCol: 26 },
      match: 'r ** 2',
      kind: 'math',
      title: 'r ** 2',
      what: 'Squares the residual.',
      why: 'Squaring makes every error count as positive (so errors above and below cannot cancel) and makes big misses cost much more than small ones.',
    },
    {
      id: 'mean',
      range: { line: 10, startCol: 6, endCol: 20 },
      match: 'total / len(x)',
      kind: 'math',
      title: 'total / n',
      what: 'Divides the sum of squared residuals by 12: the mean squared error.',
      why: 'Averaging makes the number comparable between datasets of different sizes. Its unit is kg².',
    },
    {
      id: 'round',
      range: { line: 11, startCol: 6, endCol: 19 },
      match: 'round(mse, 4)',
      kind: 'function',
      title: 'round(mse, 4)',
      what: 'Rounds to 4 decimal places for printing.',
      why: 'The readout shows the same rounded value, so you can compare them digit by digit.',
    },
  ],
};

/** The NumPy batch gradient descent loop, filled from the GD experiment. */
export const numpyGD: CodeExample = {
  id: 'linreg-numpy-gd',
  language: 'python',
  source: `import numpy as np

x = np.array(${X_LIST})  # flipper length, cm
y = np.array(${Y_LIST})  # body mass, kg
shift = {{shift}}  # 0.0 trains on raw x; x.mean() trains on centered x
xs = x - shift
lr = {{lr}}
w, b = 0.0, 0.0
for step in range({{steps}}):
    err = (w * xs + b) - y
    grad_w = 2 * np.mean(err * xs)
    grad_b = 2 * np.mean(err)
    w = w - lr * grad_w
    b = b - lr * grad_b
intercept = b - w * shift
mse = np.mean((w * xs + b - y) ** 2)
print(f"slope={w:.4f} intercept={intercept:.4f} mse={mse:.4f}")`,
  slots: {
    shift: (s) => (gd(s).center === 'centered' ? 'x.mean()' : '0.0'),
    lr: (s) => String(gd(s).lr),
    steps: (s) => String(gd(s).steps),
  },
  annotations: [
    {
      id: 'np-array',
      range: { line: 3, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array',
      what: 'Turns the list into a NumPy array, so arithmetic applies to all 12 values at once.',
      why: 'w * xs + b then computes all 12 predictions in one expression, with no Python loop.',
      output: 'shape (12,)',
    },
    {
      id: 'shift',
      range: { line: 5, startCol: 8, endCol: 17 },
      match: '{{shift}}',
      kind: 'parameter',
      title: 'shift: raw or centered x',
      what: '0.0 keeps x as it is; x.mean() (19.925 cm) subtracts the average flipper length from every x.',
      why: 'Centering does not change the best line, only how quickly gradient descent reaches it.',
    },
    {
      id: 'xs',
      range: { line: 6, startCol: 5, endCol: 14 },
      match: 'x - shift',
      kind: 'math',
      title: 'x - shift',
      what: 'The x values the loop trains on.',
      why: 'With centered x, the slope and intercept no longer pull against each other (see the lesson).',
      output: 'shape (12,)',
    },
    {
      id: 'lr',
      range: { line: 7, startCol: 5, endCol: 11 },
      match: '{{lr}}',
      kind: 'parameter',
      title: 'lr: the learning rate η',
      what: 'How far each update moves against the gradient.',
      why: 'Too small and the loss barely moves; too large and each step overshoots and the values blow up.',
    },
    {
      id: 'init',
      range: { line: 8 },
      kind: 'syntax',
      title: 'w, b = 0.0, 0.0',
      what: 'Starts from the flat line ŷ = 0.',
      why: 'Any start works for this loss (it has a single minimum); zero is the simplest to check by hand.',
    },
    {
      id: 'steps',
      range: { line: 9, startCol: 12, endCol: 28 },
      match: 'range({{steps}})',
      kind: 'function',
      title: 'range(steps)',
      what: 'Repeats the update this many times.',
      why: 'Each update uses all 12 penguins: this is batch gradient descent.',
    },
    {
      id: 'err',
      range: { line: 10, startCol: 10, endCol: 26 },
      match: '(w * xs + b) - y',
      kind: 'math',
      title: 'err = ŷ − y',
      what: 'Prediction minus truth for every penguin: the negative of the residual.',
      why: 'The gradient formulas are simplest written with ŷ − y.',
      output: 'shape (12,)',
    },
    {
      id: 'grad-w',
      range: { line: 11, startCol: 17, endCol: 34 },
      match: 'np.mean(err * xs)',
      kind: 'math',
      title: '∂MSE/∂w = 2·mean(err·x)',
      what: 'How fast the MSE rises when the slope grows a little.',
      why: 'Each penguin pulls the slope in proportion to its error times its x.',
    },
    {
      id: 'grad-b',
      range: { line: 12, startCol: 17, endCol: 29 },
      match: 'np.mean(err)',
      kind: 'math',
      title: '∂MSE/∂b = 2·mean(err)',
      what: 'How fast the MSE rises when the intercept grows a little.',
      why: 'If the line is too high on average (err > 0), the gradient is positive and b goes down.',
    },
    {
      id: 'update',
      range: { line: 13, startCol: 12, endCol: 23 },
      match: 'lr * grad_w',
      kind: 'math',
      title: 'w − η·grad',
      what: 'Moves w a step downhill on the loss.',
      why: 'Subtracting the gradient lowers the loss when the step is small enough.',
    },
    {
      id: 'intercept',
      range: { line: 15, startCol: 12, endCol: 25 },
      match: 'b - w * shift',
      kind: 'math',
      title: 'Back to the original intercept',
      what: 'With centered x the line is ŷ = w·(x − x̄) + b = w·x + (b − w·x̄).',
      why: 'So the intercept for raw x is b − w·x̄, which is what the closed form reports. With shift = 0.0 it is just b.',
    },
    {
      id: 'mse',
      range: { line: 16, startCol: 6, endCol: 36 },
      match: 'np.mean((w * xs + b - y) ** 2)',
      kind: 'framework',
      title: 'MSE in one line',
      what: 'The same mean of squared residuals as the loop earlier in the lesson, vectorized.',
      why: 'It tells you how close gradient descent got to the lowest possible MSE.',
    },
    {
      id: 'format',
      range: { line: 17, startCol: 16, endCol: 20 },
      match: ':.4f',
      kind: 'syntax',
      title: ':.4f',
      what: 'Formats a number with exactly 4 decimals.',
      why: 'The readout prints the same format, so you can compare it with this line’s output.',
    },
  ],
};

/** The closed-form answer two ways. Not linked to an experiment, so it has no slots. */
export const closedForm: CodeExample = {
  id: 'linreg-closed-form',
  language: 'python',
  source: `import numpy as np

x = np.array(${X_LIST})  # flipper length, cm
y = np.array(${Y_LIST})  # body mass, kg

dx = x - x.mean()
slope = np.sum(dx * (y - y.mean())) / np.sum(dx ** 2)
intercept = y.mean() - slope * x.mean()
print(f"formula: slope={slope:.4f} intercept={intercept:.4f}")

slope2, intercept2 = np.polyfit(x, y, 1)
print(f"polyfit: slope={slope2:.4f} intercept={intercept2:.4f}")

mse = np.mean((slope * x + intercept - y) ** 2)
print(f"MSE={mse:.4f}")`,
  annotations: [
    {
      id: 'dx',
      range: { line: 6, startCol: 5, endCol: 17 },
      match: 'x - x.mean()',
      kind: 'math',
      title: 'x − x̄',
      what: 'How far each flipper is from the average flipper (19.925 cm).',
      why: 'The slope formula is written in these centered values.',
    },
    {
      id: 'slope',
      range: { line: 7, startCol: 8, endCol: 53 },
      match: 'np.sum(dx * (y - y.mean())) / np.sum(dx ** 2)',
      kind: 'math',
      title: 'slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²',
      what: 'How much x and y vary together, divided by how much x varies on its own.',
      why: 'Setting both derivatives of the MSE to zero and solving gives exactly this.',
      output: '9.1556 / 21.2825 = 0.4302 kg per cm',
    },
    {
      id: 'intercept',
      range: { line: 8, startCol: 12, endCol: 39 },
      match: 'y.mean() - slope * x.mean()',
      kind: 'math',
      title: 'intercept = ȳ − slope·x̄',
      what: 'Places the line so it passes through the point of averages (x̄, ȳ).',
      why: 'The least-squares line always goes through (19.925, 4.1979).',
      output: '4.1979 − 0.4302 × 19.925 = −4.3737 kg',
    },
    {
      id: 'polyfit',
      range: { line: 11, startCol: 21, endCol: 40 },
      match: 'np.polyfit(x, y, 1)',
      kind: 'framework',
      title: 'np.polyfit(x, y, deg=1)',
      what: 'Fits a polynomial of degree 1 (a line) by least squares.',
      why: 'One call instead of the formula. It returns coefficients from the highest power down: slope first, then intercept.',
      output: 'array([slope, intercept])',
    },
  ],
  expectedOutput: `formula: slope=0.4302 intercept=-4.3737
polyfit: slope=0.4302 intercept=-4.3737
MSE=0.1210`,
};

export const sklearnFit: CodeExample = {
  id: 'linreg-sklearn',
  language: 'python',
  source: `import numpy as np
from sklearn.linear_model import LinearRegression

x = np.array(${X_LIST})  # flipper length, cm
y = np.array(${Y_LIST})  # body mass, kg

X = x.reshape(-1, 1)  # shape (12, 1): 12 rows, 1 feature
model = LinearRegression().fit(X, y)
print(model.coef_, model.intercept_)
print(model.predict([[20.0]]))`,
  annotations: [
    {
      id: 'reshape',
      range: { line: 7, startCol: 4, endCol: 20 },
      match: 'x.reshape(-1, 1)',
      kind: 'framework',
      title: 'x.reshape(-1, 1)',
      what: 'Turns 12 numbers of shape (12,) into a column of shape (12, 1).',
      why: 'scikit-learn expects a 2-D feature matrix X with one row per example and one column per feature, even when there is only one feature.',
      output: 'shape (12, 1)',
    },
    {
      id: 'fit',
      range: { line: 8, startCol: 8, endCol: 36 },
      match: 'LinearRegression().fit(X, y)',
      kind: 'framework',
      title: 'LinearRegression().fit(X, y)',
      what: 'Solves the least-squares problem directly (no learning rate, no steps) and stores the answer.',
      why: 'It is the closed form, computed with a numerically careful linear-algebra solver.',
    },
    {
      id: 'coef',
      range: { line: 9, startCol: 6, endCol: 17 },
      match: 'model.coef_',
      kind: 'framework',
      title: 'coef_ and intercept_',
      what: 'coef_ holds one slope per feature (an array of shape (1,) here); intercept_ is a single number.',
      why: 'The trailing underscore is scikit-learn’s convention for values learned by fit.',
    },
    {
      id: 'predict',
      range: { line: 10, startCol: 6, endCol: 29 },
      match: 'model.predict([[20.0]])',
      kind: 'framework',
      title: 'predict([[20.0]])',
      what: 'Predicts the mass of a penguin with a 20 cm flipper: 0.430195 × 20 − 4.373719 = 4.2302 kg.',
      why: 'predict also takes a 2-D input: one row per penguin, here one row with one feature.',
    },
  ],
  expectedOutput: `[0.430195] -4.373718626414498
[4.23018129]`,
};

/** Pure Python, so it runs in the browser without downloading NumPy. */
export const leastSquaresRunner: CodeExample = {
  id: 'linreg-runner',
  language: 'python',
  run: 'pyodide',
  source: `x = ${X_LIST}
y = ${Y_LIST}
n = len(x)
x_bar = sum(x) / n
y_bar = sum(y) / n
sxy = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))
sxx = sum((xi - x_bar) ** 2 for xi in x)
slope = sxy / sxx
intercept = y_bar - slope * x_bar
print(round(x_bar, 4), round(y_bar, 4))
print(round(sxy, 4), round(sxx, 4))
print(round(slope, 4), round(intercept, 4))`,
  annotations: [],
  expectedOutput: `19.925 4.1979
9.1556 21.2825
0.4302 -4.3737`,
};
